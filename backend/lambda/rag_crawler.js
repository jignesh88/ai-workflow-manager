// rag_crawler.js - Lambda function for crawling websites in the RAG pipeline

const axios = require('axios');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');
const urlParse = require('url-parse');

// Initialize AWS services
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

/**
 * Lambda handler for crawling websites in the RAG pipeline
 * 
 * @param {Object} event - Step Functions event
 * @param {Object} event.dataSource - Data source configuration
 * @param {string} event.dataSource.type - Source type ('website')
 * @param {string} event.dataSource.url - Website URL to crawl
 * @param {string} event.dataSource.name - Source name
 * @param {string} event.tenantId - Tenant ID
 * @param {Object} event.config - Configuration
 * @param {number} event.config.crawlDepth - Crawl depth
 * @param {string} context - Lambda context
 * @returns {Object} - Crawl result
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Extract parameters from event
  const { dataSource, tenantId, config } = event;
  const { url, name } = dataSource;
  const crawlDepth = config.crawlDepth || 1;
  
  try {
    // Check if valid URL
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }
    
    // Normalize the URL
    const baseUrl = normalizeUrl(url);
    const parsedUrl = new urlParse(baseUrl);
    const domain = parsedUrl.hostname;
    
    console.log(`Starting crawl of ${baseUrl} for tenant ${tenantId} with depth ${crawlDepth}`);
    
    // Track visited URLs to avoid duplicates
    const visitedUrls = new Set();
    // Track URLs to be crawled
    let urlsToCrawl = [baseUrl];
    // Track crawled content
    const crawledPages = [];
    
    // Crawl up to specified depth
    for (let depth = 0; depth < crawlDepth; depth++) {
      console.log(`Crawling at depth ${depth + 1}, URLs to process: ${urlsToCrawl.length}`);
      
      // Process URLs at current depth level
      const newUrlsToCrawl = [];
      
      // Process in batches to avoid overwhelming the target server
      const batchSize = 5;
      for (let i = 0; i < urlsToCrawl.length; i += batchSize) {
        const urlBatch = urlsToCrawl.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = urlBatch.map(async (urlToCrawl) => {
          if (visitedUrls.has(urlToCrawl)) {
            return null; // Skip already visited URLs
          }
          
          visitedUrls.add(urlToCrawl);
          
          try {
            const { content, links } = await crawlUrl(urlToCrawl, parsedUrl);
            
            if (content && content.trim()) {
              crawledPages.push({
                url: urlToCrawl,
                content,
                timestamp: new Date().toISOString()
              });
            }
            
            // Add new links to be crawled in the next depth level
            if (depth < crawlDepth - 1) {
              links.forEach(link => {
                if (!visitedUrls.has(link) && isSameDomain(link, domain)) {
                  newUrlsToCrawl.push(link);
                }
              });
            }
          } catch (error) {
            console.error(`Error crawling ${urlToCrawl}:`, error.message);
            // Continue with other URLs
          }
        });
        
        await Promise.all(batchPromises);
        
        // Add a small delay between batches to be respectful
        if (i + batchSize < urlsToCrawl.length) {
          await delay(1000);
        }
      }
      
      // Update URLs to crawl for next depth level
      urlsToCrawl = [...new Set(newUrlsToCrawl)];
      
      // If no more URLs to crawl, break the loop
      if (urlsToCrawl.length === 0) {
        break;
      }
    }
    
    console.log(`Crawl completed. Total pages: ${crawledPages.length}`);
    
    // Store crawled content in S3
    const timestamp = new Date().getTime();
    const s3Key = `${tenantId}/raw-content/${name}-${timestamp}.json`;
    
    await s3.putObject({
      Bucket: process.env.DOCUMENT_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(crawledPages),
      ContentType: 'application/json',
      Metadata: {
        'tenant-id': tenantId,
        'source-name': name,
        'source-url': baseUrl,
        'source-type': 'website',
        'crawl-timestamp': timestamp.toString()
      }
    }).promise();
    
    // Update metadata in DynamoDB
    await dynamoDB.put({
      TableName: process.env.METADATA_TABLE,
      Item: {
        id: `source-${name}-${timestamp}`,
        tenantId: tenantId,
        itemType: 'source',
        sourceType: 'website',
        sourceName: name,
        sourceUrl: baseUrl,
        s3Key: s3Key,
        pageCount: crawledPages.length,
        crawlTimestamp: timestamp,
        status: 'crawled',
        createdAt: new Date().toISOString()
      }
    }).promise();
    
    // Return result
    return {
      sourceId: `source-${name}-${timestamp}`,
      tenantId: tenantId,
      sourceType: 'website',
      sourceName: name,
      sourceUrl: baseUrl,
      s3Key: s3Key,
      pageCount: crawledPages.length,
      crawlTimestamp: timestamp,
      status: 'success'
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Send error to dead-letter queue for further analysis
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({
        error: error.message,
        event: event,
        timestamp: new Date().toISOString(),
        service: 'rag-crawler'
      })
    }).promise();
    
    throw error;
  }
};

/**
 * Crawl a URL and extract content and links
 * 
 * @param {string} url - URL to crawl
 * @param {Object} parsedBaseUrl - Parsed base URL
 * @returns {Object} - Content and links
 */
async function crawlUrl(url, parsedBaseUrl) {
  console.log(`Crawling URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ChatbotCrawler/1.0',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000, // 10 seconds timeout
      maxRedirects: 5
    });
    
    if (response.status !== 200) {
      console.warn(`Non-200 status code (${response.status}) for ${url}`);
      return { content: '', links: [] };
    }
    
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      console.warn(`Skipping non-HTML content type: ${contentType} for ${url}`);
      return { content: '', links: [] };
    }
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove script, style, and other non-content elements
    $('script, style, meta, link, noscript, iframe, svg, path, header, footer, nav').remove();
    
    // Extract text content
    let content = '';
    
    // Extract title
    const title = $('title').text().trim();
    if (title) {
      content += `# ${title}\n\n`;
    }
    
    // Extract headings and paragraphs
    $('h1, h2, h3, h4, h5, h6, p, li, td, th, dd, dt').each((i, elem) => {
      const text = $(elem).text().trim().replace(/\s+/g, ' ');
      if (text) {
        const tagName = elem.tagName.toLowerCase();
        if (tagName.startsWith('h')) {
          const level = parseInt(tagName.substring(1), 10);
          const prefix = '#'.repeat(level);
          content += `${prefix} ${text}\n\n`;
        } else {
          content += `${text}\n\n`;
        }
      }
    });
    
    // Extract links
    const links = [];
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        try {
          const absoluteUrl = makeAbsoluteUrl(href, url, parsedBaseUrl);
          if (absoluteUrl && isValidUrl(absoluteUrl)) {
            links.push(absoluteUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    
    return { content: content.trim(), links: [...new Set(links)] };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return { content: '', links: [] };
  }
}

/**
 * Convert relative URL to absolute URL
 * 
 * @param {string} href - Relative or absolute URL
 * @param {string} currentUrl - Current URL
 * @param {Object} parsedBaseUrl - Parsed base URL
 * @returns {string} - Absolute URL
 */
function makeAbsoluteUrl(href, currentUrl, parsedBaseUrl) {
  // Skip anchors and javascript links
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
    return null;
  }
  
  // Remove anchor and query string
  href = href.split('#')[0];
  
  try {
    // If already absolute, return as is
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    
    // If protocol-relative URL
    if (href.startsWith('//')) {
      return `${parsedBaseUrl.protocol}${href}`;
    }
    
    // Absolute path
    if (href.startsWith('/')) {
      return `${parsedBaseUrl.origin}${href}`;
    }
    
    // Relative path - resolve against current URL
    const baseUrl = new URL(currentUrl);
    return new URL(href, baseUrl).href;
  } catch (error) {
    console.warn(`Invalid URL: ${href}`);
    return null;
  }
}

/**
 * Check if a URL is valid
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch (e) {
    return false;
  }
}

/**
 * Check if a URL is from the same domain
 * 
 * @param {string} url - URL to check
 * @param {string} domain - Domain to compare against
 * @returns {boolean} - True if same domain
 */
function isSameDomain(url, domain) {
  try {
    const urlDomain = new URL(url).hostname;
    return urlDomain === domain || urlDomain.endsWith(`.${domain}`);
  } catch (e) {
    return false;
  }
}

/**
 * Normalize URL by removing trailing slash
 * 
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  try {
    const parsedUrl = new URL(url);
    let normalizedUrl = parsedUrl.origin + parsedUrl.pathname;
    normalizedUrl = normalizedUrl.replace(/\/$/, '');
    if (parsedUrl.search) {
      normalizedUrl += parsedUrl.search;
    }
    return normalizedUrl;
  } catch (e) {
    return url;
  }
}

/**
 * Delay execution for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// TenantBranding.js - Component for applying tenant-specific branding
import React, { useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';

const TenantBranding = () => {
  const { tenantConfig, getTenantBrandingVariables } = useTenant();
  
  useEffect(() => {
    if (!tenantConfig) return;
    
    // Apply CSS variables to root element
    const brandingVariables = getTenantBrandingVariables();
    const root = document.documentElement;
    
    Object.entries(brandingVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Set favicon if provided
    if (tenantConfig.faviconUrl) {
      const existingFavicon = document.getElementById('favicon');
      if (existingFavicon) {
        existingFavicon.href = tenantConfig.faviconUrl;
      } else {
        const favicon = document.createElement('link');
        favicon.id = 'favicon';
        favicon.rel = 'shortcut icon';
        favicon.href = tenantConfig.faviconUrl;
        document.head.appendChild(favicon);
      }
    }
    
    // Set document title if tenant name provided
    if (tenantConfig.name) {
      document.title = `${tenantConfig.name} | AI Workflow Manager`;
    }
    
    // Add custom font if needed
    if (tenantConfig.fontFamily && !document.getElementById('tenant-font')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'tenant-font';
      fontLink.rel = 'stylesheet';
      
      // Map common font names to Google Fonts URLs
      const fontMap = {
        'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
        'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
      };
      
      const fontFamily = tenantConfig.fontFamily.split(',')[0].trim();
      if (fontMap[fontFamily]) {
        fontLink.href = fontMap[fontFamily];
        document.head.appendChild(fontLink);
      }
    }
    
    return () => {
      // Clean up custom font if component unmounts
      const fontLink = document.getElementById('tenant-font');
      if (fontLink) {
        document.head.removeChild(fontLink);
      }
    };
  }, [tenantConfig, getTenantBrandingVariables]);
  
  // This component doesn't render anything visible
  return null;
};

export default TenantBranding;
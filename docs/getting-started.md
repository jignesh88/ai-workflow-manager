# Getting Started with AI Workflow Manager

This guide will help you set up and configure the AI Workflow Manager platform on AWS. Follow these steps to get started with deploying your own multi-tenant chatbot solution.

## Prerequisites

Before you begin, make sure you have the following prerequisites:

1. **AWS Account** with administrator access
2. **AWS CLI** configured with appropriate credentials
3. **Terraform** (v1.0+) installed locally
4. **Node.js** (v14+) and npm (for frontend development)
5. **Docker** (for local development and testing)
6. **LiveKit** account (for voice capabilities)
7. **Domain Name** (for hosting the application)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/jignesh88/ai-workflow-manager.git
cd ai-workflow-manager
```

### 2. Configure AWS Resources

#### Set up Terraform backend

First, create an S3 bucket and DynamoDB table for Terraform state management:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket chatbot-terraform-state \
  --region us-east-1

# Enable bucket versioning
aws s3api put-bucket-versioning \
  --bucket chatbot-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name chatbot-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### Configure Terraform variables

Create a `terraform.tfvars` file in the `infrastructure/terraform` directory with your specific configuration:

```hcl
# General
project_name      = "ai-workflow-manager"
environment       = "dev"
aws_region        = "us-east-1"

# VPC Configuration
vpc_cidr          = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
public_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets    = ["10.0.3.0/24", "10.0.4.0/24"]

# Cognito Configuration
cognito_callback_urls = ["https://app.yourdomain.com/callback"]
cognito_logout_urls   = ["https://app.yourdomain.com"]

# Social Login
google_client_id      = "your-google-client-id"
google_client_secret  = "your-google-client-secret"
facebook_client_id    = "your-facebook-client-id"
facebook_client_secret = "your-facebook-client-secret"

# Frontend Configuration
frontend_certificate_arn = "your-certificate-arn"
frontend_alternate_domains = ["app.yourdomain.com"]

# OpenSearch Configuration
opensearch_instance_type = "t3.small.search"
opensearch_instance_count = 1

# ElastiCache Configuration
elasticache_node_type = "cache.t3.small"
elasticache_num_nodes = 1

# EKS Configuration
kubernetes_version = "1.24"
eks_min_nodes      = 1
eks_max_nodes      = 3
eks_desired_nodes  = 2

# Domain Configuration
domain_name        = "yourdomain.com"

# Monitoring
alarm_actions      = ["your-sns-topic-arn"]
```

### 3. Initialize and Apply Terraform

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

This will create all the necessary AWS resources, including VPC, S3 buckets, DynamoDB tables, Lambda functions, Step Functions, API Gateway, and more.

### 4. Configure Frontend

Create a `.env` file in the `frontend` directory:

```
REACT_APP_AWS_REGION=us-east-1
REACT_APP_COGNITO_USER_POOL_ID=your-user-pool-id
REACT_APP_COGNITO_CLIENT_ID=your-client-id
REACT_APP_COGNITO_DOMAIN=your-cognito-domain.auth.us-east-1.amazoncognito.com
REACT_APP_REDIRECT_URL=https://app.yourdomain.com/callback
REACT_APP_API_ENDPOINT=https://api.yourdomain.com
REACT_APP_LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
```

### 5. Build and Deploy Frontend

```bash
cd frontend
npm install
npm run build

# Upload to S3
aws s3 sync build/ s3://ai-workflow-manager-frontend-dev/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 6. Set up First Tenant

Create your first tenant using the AWS CLI:

```bash
# Create tenant in DynamoDB
aws dynamodb put-item \
  --table-name ai-workflow-manager-configs-dev \
  --item '{"id":{"S":"tenant-config"},"tenantId":{"S":"tenant1"},"name":{"S":"Demo Tenant"},"primaryColor":{"S":"#6366f1"},"secondaryColor":{"S":"#4f46e5"},"fontFamily":{"S":"Inter"},"createdAt":{"S":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},"itemType":{"S":"tenantConfig"}}'
```

### 7. Create Admin User

Create an admin user for the tenant:

```bash
# Create user in Cognito
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --temporary-password Admin@123 \
  --user-attributes Name=email,Value=admin@example.com Name=custom:tenantId,Value=tenant1
```

## Using the Platform

### Accessing the Dashboard

1. Navigate to `https://app.yourdomain.com`
2. Sign in using the admin credentials you created
3. Complete the forced password change if prompted

### Creating Your First Chatbot

1. From the dashboard, click "Create New Chatbot"
2. In the workflow builder, drag nodes to create your chatbot flow:
   - Add a Document Upload node for knowledge base documents
   - Add a RAG Pipeline node for web crawling and context
   - Add a Voice Integration node for voice capabilities
3. Configure each node with appropriate settings
4. Connect the nodes to define the chatbot workflow
5. Save the workflow and test it in the preview pane

### Testing RAG Pipeline

1. Configure the RAG Pipeline node with website URLs or documents
2. Set the crawl frequency and memory duration
3. Click "Test RAG Configuration" to validate
4. Once validated, save the configuration
5. The system will begin crawling and generating embeddings

### Testing Voice Agent

1. Configure the Voice Agent node with voice and language settings
2. Click "Connect" in the preview pane to test voice capabilities
3. Speak to the chatbot and receive audio responses

## Troubleshooting

### Common Issues

#### Terraform Apply Fails

- Check AWS credentials and permissions
- Ensure all required variables are set in `terraform.tfvars`
- Review Terraform logs for specific errors

#### Frontend Build Fails

- Check Node.js version compatibility
- Ensure all environment variables are set correctly
- Run `npm install` to update dependencies

#### Authentication Issues

- Verify Cognito User Pool and App Client settings
- Check callback URLs in Cognito configuration
- Ensure tenant ID is set correctly for users

#### RAG Pipeline Issues

- Check OpenSearch domain status
- Verify Lambda functions have proper permissions
- Review CloudWatch logs for specific errors

## Customizing the Platform

### Tenant Branding

Customize the look and feel for each tenant by updating the tenant settings:

```bash
aws dynamodb update-item \
  --table-name ai-workflow-manager-configs-dev \
  --key '{"id":{"S":"tenant-config"},"tenantId":{"S":"tenant1"}}' \
  --update-expression "SET primaryColor = :pc, secondaryColor = :sc, fontFamily = :ff" \
  --expression-attribute-values '{":pc":{"S":"#4f46e5"},":sc":{"S":"#6366f1"},":ff":{"S":"Poppins"}}'
```

### Adding Custom Node Types

To add custom node types to the workflow builder:

1. Create a new React component in `frontend/src/pages/WorkflowBuilder/nodes/`
2. Register the node type in `frontend/src/pages/WorkflowBuilder/WorkflowBuilder.js`
3. Create a configuration panel in `frontend/src/pages/WorkflowBuilder/config/`
4. Implement the backend Lambda functions for the node's functionality
5. Update the Step Functions state machine to include the new workflow steps

## Next Steps

- Set up monitoring and alerting for production use
- Implement backup and disaster recovery procedures
- Create additional tenant accounts and test multi-tenant isolation
- Integrate with your existing systems via the API capabilities
- Develop custom node types for specific use cases

## Resources

- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [React Flow Documentation](https://reactflow.dev/docs/)
- [LiveKit Documentation](https://docs.livekit.io/)

## Support

For support, please create an issue in the GitHub repository or contact the maintainers directly.
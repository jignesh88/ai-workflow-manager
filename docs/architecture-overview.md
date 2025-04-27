# AI Workflow Manager - Architecture Overview

This document provides a comprehensive overview of the AI Workflow Manager architecture, explaining the key components and how they interact to deliver a secure, scalable, multi-tenant chatbot platform.

## Overall Architecture

The AI Workflow Manager employs a modern, cloud-native architecture using AWS services as its foundation. The architecture focuses on the following key principles:

1. **Multi-Tenant Security**: Complete isolation between tenants at all levels
2. **Scalability**: Designed to handle increasing workloads and tenant count
3. **Serverless First**: Minimizing infrastructure management overhead
4. **Workflow-Driven**: Step Functions for reliable process orchestration
5. **RAG-Powered**: Retrieval-Augmented Generation for contextual responses

## Architecture Diagram

```
                        ┌────────────────┐
                        │  CloudFront CDN │
                        └─────────┬───────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │  S3 Frontend   │
                        └─────────────────┘
                                 │
                                 ▼
            ┌────────────────────────────────────┐
            │        API Gateway + Lambda       │
            └───────────────────────┬────────────┘
                                │
                     ┌──────────┴──────────┐
                     ▼                      ▼
┌────────────────────────┐        ┌────────────────────┐
│  Cognito (Auth)       │        │ Step Functions        │
└────────────────────────┘        └──────────┬───────────┘
                                             │
                ┌─────────────────────────────┼─────────────────────────┐
                ▼                            ▼                            ▼
     ┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐
     │ Document Processing │      │ API Integration    │      │ RAG Pipeline       │
     └──────────┬─────────┘      └──────────┬─────────┘      └──────────┬─────────┘
               │                           │                            │
               ▼                           ▼                            ▼
     ┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐
     │ S3 Storage          │      │ DynamoDB Tables    │      │ OpenSearch Vectors │
     └────────────────────┘      └────────────────────┘      └──────────┬─────────┘
                                                                      │
                                                                      ▼
                                                           ┌────────────────────┐
                                                           │ ElastiCache Redis  │
                                                           └────────────────────┘
```

## Core Components

### 1. Frontend

- **React SPA**: Single-page application using React
- **React Flow**: For drag-and-drop workflow builder
- **CloudFront & S3**: For hosting, caching, and global distribution
- **TailwindCSS**: For Stripe-like UI with customization

### 2. Authentication & Authorization

- **AWS Cognito**: For user authentication, social media login
- **JWT Tokens**: With tenant ID claims for authorization
- **Custom Claims**: Tenant-specific attributes and permissions

### 3. API Layer

- **API Gateway**: RESTful API endpoints with tenant isolation
- **Lambda Authorizer**: Validates tenant permissions
- **WAF**: Protection against common attacks

### 4. Workflow Orchestration

- **Step Functions**: State machines for reliable workflows
- **Activity Tracking**: DynamoDB for workflow state
- **Error Handling**: Robust retry and recovery mechanisms

### 5. RAG Pipeline

- **Web Crawler**: Lambda function for crawling websites
- **Embedding Generator**: Creates vector embeddings from text
- **OpenSearch**: Vector search for relevant content retrieval
- **Context Memory**: Redis for short-term conversation memory

### 6. Storage & Databases

- **DynamoDB**: Tenant-isolated tables with GSIs
- **S3**: Tenant-prefixed object storage
- **OpenSearch**: Tenant-specific indices
- **ElastiCache**: Tenant-keyed Redis for context

### 7. Voice Integration

- **LiveKit**: WebRTC infrastructure for voice
- **AWS Transcribe**: Speech-to-text processing
- **AWS Polly**: Text-to-speech synthesis

## Multi-Tenant Design

Tenant isolation is implemented at every layer of the architecture:

### Data Isolation

- **DynamoDB**: Tenant ID as partition key or sort key
- **S3**: Tenant-prefixed object paths
- **OpenSearch**: Tenant-specific indices
- **Redis**: Tenant-prefixed keys

### Compute Isolation

- **Lambda**: Tenant context in environment
- **Step Functions**: Tenant-specific state machines
- **API Gateway**: Tenant authorization in requests

### Security Isolation

- **IAM**: Tenant-scoped policies
- **KMS**: Tenant-specific encryption keys
- **Secrets Manager**: Tenant-specific secrets

## Workflow Steps

### Document Processing

1. Upload document to S3 with tenant prefix
2. Extract text using AWS Textract
3. Store metadata in DynamoDB with tenant ID
4. Optionally process for RAG pipeline

### API Integration

1. Configure external API connection
2. Store authentication in Secrets Manager with tenant isolation
3. Test and validate API responses
4. Integrate API data into chatbot context

### RAG Pipeline

1. Crawl websites or integrate with external data sources
2. Process and chunk text for semantic meaning
3. Generate vector embeddings using transformer models
4. Store embeddings in OpenSearch with tenant isolation
5. Configure context memory duration in Redis
6. Implement retrieval for chatbot queries

### Voice Integration

1. Configure LiveKit rooms with tenant-specific tokens
2. Process audio with AWS Transcribe for speech-to-text
3. Generate responses with RAG-enhanced chatbot
4. Synthesize speech with AWS Polly
5. Stream audio back to the client

## Security Considerations

### Authentication

- JWT token validation at API Gateway
- Tenant ID verification on all resources
- Cognito User Pools with custom attributes
- Social login integration with secure token exchange

### Authorization

- Resource-level permissions with tenant scoping
- IAM roles with least privilege principle
- Dynamic policy generation for tenant isolation

### Data Protection

- Encryption at rest with KMS
- Encryption in transit with TLS
- Tenant-specific encryption keys
- S3 bucket policies for tenant isolation

### Network Security

- VPC with public and private subnets
- Security groups for traffic control
- WAF rules for API protection
- CloudFront with geo-restrictions if needed

## Scalability Considerations

### Horizontal Scaling

- Lambda concurrency for spike handling
- DynamoDB on-demand capacity
- EKS node auto-scaling
- ElastiCache cluster scaling

### Tenant Scaling

- Shared resources with logical isolation
- Per-tenant rate limiting
- Resource allocation based on tier
- Monitoring and alerts per tenant

## Infrastructure as Code

All infrastructure is defined and deployed using Terraform:

- Modular structure for reusability
- Environment-specific configurations
- Tenant resource provisioning
- State management in S3 with locking

## Deployment Pipeline

- AWS CodePipeline for CI/CD
- Automated testing before deployment
- Infrastructure validation
- Tenant-aware deployment strategies

## Monitoring and Observability

- CloudWatch metrics and logs
- X-Ray tracing for requests
- Tenant-specific dashboards
- Alerting on tenant-level anomalies

## Conclusion

The AI Workflow Manager architecture provides a robust foundation for building and deploying multi-tenant chatbots with RAG capabilities. The design emphasizes security, scalability, and maintainability while enabling a rich set of features for end users.
# AI Workflow Manager

A secure, scalable, cloud-native, multi-tenant chatbot platform with RAG pipeline and voice capabilities built on AWS.

## Overview

AI Workflow Manager is a comprehensive solution that enables multiple tenants to create customizable chatbots with:

- Document upload and processing
- External API integration
- Voice agents using the LiveKit stack
- Retrieval-Augmented Generation (RAG) pipeline for contextual responses

The platform features a plug-and-play workflow builder using React Flow UI, allowing tenants to define chatbot creation steps, including configuring the RAG pipeline.

## Architecture

- **Frontend**: React SPA with React Flow UI and Stripe-like UI
- **Authentication**: AWS Cognito with social media login
- **Backend**: Microservices architecture with AWS Lambda and EKS
- **Workflow Orchestration**: AWS Step Functions
- **RAG Pipeline**: OpenSearch for vector storage, Lambda for processing
- **Voice Integration**: LiveKit with AWS Transcribe and Polly
- **Infrastructure**: Terraform for IaC

## Features

- Multi-tenant architecture with tenant isolation
- Drag-and-drop workflow builder
- Document processing with AWS Textract
- External API integration
- RAG pipeline for enhanced contextual responses
- Voice capabilities with LiveKit
- Tenant-specific branding and configuration
- Usage metrics and analytics

## Repository Structure

```
├── frontend/           # React application
├── backend/            # Backend services
│   ├── lambda/         # Lambda functions
│   ├── step-functions/ # Step Function definitions
│   └── api/            # API definitions
├── infrastructure/     # Terraform IaC
└── docs/               # Documentation
```

## Getting Started

See the [documentation](./docs/getting-started.md) for installation and setup instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
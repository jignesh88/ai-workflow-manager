# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Install dependencies: `npm install` (in frontend directory)
- Build frontend: `npm run build` (in frontend directory)
- Deploy frontend: `aws s3 sync build/ s3://ai-workflow-manager-frontend-dev/`
- Initialize Terraform: `terraform init` (in infrastructure/terraform directory)
- Apply infrastructure: `terraform apply` (in infrastructure/terraform directory)

## Code Style Guidelines
- **Languages**: JavaScript/React for frontend, JavaScript for Lambda functions, HCL for Terraform
- **Naming**: camelCase for variables/functions, PascalCase for React components
- **Error Handling**: Use try/catch blocks and log errors with appropriate context
- **Frontend Structure**: Components in frontend/src/components, pages in frontend/src/pages
- **Lambda Functions**: Single-responsibility modules with clear input/output contracts
- **Terraform**: Use modules for reusable components, follow AWS best practices
- **Documentation**: Include JSDoc comments for functions, document infrastructure changes

## Multi-tenant Requirements
- Always maintain tenant isolation in data access and storage
- Include tenantId in database queries, S3 paths, and permissions checks
- Consider tenant context in all authentication and authorization decisions
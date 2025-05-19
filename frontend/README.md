# AI Workflow Manager Frontend

This is the frontend application for the AI Workflow Manager, a multi-tenant chatbot platform with RAG capabilities.

## Node.js Version

This project requires Node.js 18 or later. A `.nvmrc` file is included for easy version management with nvm.

```bash
# If using nvm, you can simply run:
nvm use
```

## Recent Changes

- Updated Node.js version requirements from Node 21 to Node 18 for better compatibility
- Fixed ESLint errors related to template syntax in ApiConfig.js
- Improved Docker configuration to use Node 18

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

For a more complete development environment with mock API:
```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

## Docker

You can also run the application using Docker:

```bash
# Build the Docker image
docker build -t ai-workflow-manager-frontend .

# Run the container
docker run -p 80:80 ai-workflow-manager-frontend
```

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```
REACT_APP_AWS_REGION=us-east-1
REACT_APP_COGNITO_USER_POOL_ID=your-user-pool-id
REACT_APP_COGNITO_CLIENT_ID=your-client-id
REACT_APP_COGNITO_DOMAIN=your-cognito-domain.auth.us-east-1.amazoncognito.com
REACT_APP_REDIRECT_URL=https://app.yourdomain.com/callback
REACT_APP_API_ENDPOINT=https://api.yourdomain.com
REACT_APP_LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
```

## Learn More

For more detailed information, see the [architecture documentation](/docs/architecture-overview.md) and [getting started guide](/docs/getting-started.md).
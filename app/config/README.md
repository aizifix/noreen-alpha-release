# API Configuration Guide

## Overview

This application uses a centralized API configuration to make it easy to deploy to different environments without hardcoding URLs throughout the codebase.

## Environment Variables

Create environment-specific `.env` files for different deployment targets:

### Development (.env.local)

```
NEXT_PUBLIC_API_URL=https://noreen-events.online/noreen-events
```

### Staging (.env.staging)

```
NEXT_PUBLIC_API_URL=https://noreen-events.online/noreen-events
```

### Production (.env.production)

```
NEXT_PUBLIC_API_URL=https://noreen-events.online/noreen-events
```

## Usage

The application automatically uses the appropriate environment variables based on the environment. When deploying:

1. For local development, create a `.env.local` file with the Namecheap backend URL
2. For staging, use the same Namecheap backend URL
3. For production, use the same Namecheap backend URL

**Important**: This application is configured to always use the remote Namecheap backend (`https://noreen-events.online/noreen-events`) for consistency between development and production environments.

## How It Works

The configuration is accessed through the central `app/config/api.ts` file, which exports:

- `API_URL`: The base API URL from environment variables (with Namecheap backend fallback)
- `endpoints`: Object with specific API endpoint paths

In your code, import from this config instead of hardcoding URLs:

```typescript
import { adminApi, clientApi } from "@/app/utils/api";

// Example usage
const response = await adminApi.post(payload);
```

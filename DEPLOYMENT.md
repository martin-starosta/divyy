# Deployment Guide

This guide covers deploying the Divvy monorepo to Vercel and other platforms.

## Quick Deploy to Vercel

### Option 1: Using Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will detect it's a Next.js project

2. **Configure Build Settings**
   - Framework Preset: `Next.js`
   - Build Command: `turbo build --filter=@repo/web`
   - Output Directory: `apps/web/.next`
   - Install Command: `npm install`
   - Development Command: `turbo dev --filter=@repo/web`

3. **Set Environment Variables**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ALPHA_VANTAGE_API_KEY=your-key (optional)
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Deploy" - Vercel will build and deploy automatically

### Option 2: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Preview deployment
   vercel

   # Production deployment  
   vercel --prod
   ```

## Manual Deployment Process

### Build for Production

```bash
# Complete production build
npm run build:production

# Or simplified build (recommended for deployment)
node scripts/deploy-vercel-simple.js
```

### Environment Configuration

#### Required Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

#### Optional Environment Variables
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage API key for additional data
- `FMP_API_KEY` - Financial Modeling Prep API key
- `ALLOWED_ORIGIN` - CORS origin (defaults to *)

### Build Process

The deployment process:
1. **Install dependencies** (`npm ci`)
2. **Build shared packages** (core, utils, configs)
3. **Type check web app** 
4. **Build Next.js app**
5. **Verify build outputs**

## Vercel Configuration

### vercel.json
```json
{
  "buildCommand": "turbo build --filter=@repo/web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Next.js Configuration
Key optimizations in `apps/web/next.config.ts`:
- `output: 'standalone'` - Optimizes for serverless deployment
- `outputFileTracingRoot` - Fixes monorepo path detection
- `optimizePackageImports` - Optimizes @repo/core imports
- Webpack config for monorepo symlinks

## CI/CD with GitHub Actions

The project includes a GitHub Action (`.github/workflows/vercel-deploy.yml`) that:
- Builds the project on push/PR
- Deploys preview for PRs
- Deploys production for main branch
- Posts deployment URLs as PR comments

### Required Secrets
Set these in GitHub repository settings:
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `TURBO_TOKEN` - Turborepo Remote Cache token (optional)
- `TURBO_TEAM` - Turborepo team slug (optional)

## Deployment Commands

```bash
# Development setup
npm run setup                    # Setup dev environment
npm run check                    # Health check

# Building
npm run build                    # Build all packages
npm run build:web               # Build web app only
npm run build:production        # Production build with tests

# Deployment
npm run deploy:vercel           # Full deployment build
node scripts/deploy-vercel-simple.js  # Simplified build
npm run deploy:preview          # Deploy preview (requires VERCEL_TOKEN)
npm run deploy:prod             # Deploy production (requires VERCEL_TOKEN)
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clean and rebuild
npm run clean:all
npm install
npm run build
```

#### Module Resolution Issues
```bash
# Check workspace health
npm run check

# Reinstall dependencies
npm run reset
```

#### Environment Variable Issues
- Ensure all required env vars are set in Vercel dashboard
- Check `.env.example` for complete list
- Verify Supabase URL and key are correct

#### TypeScript Issues
```bash
# Type check specific packages
npm run type-check:web
npm run type-check:core
```

### Performance Optimization

- **Standalone output**: Reduces deployment size
- **Package optimization**: `optimizePackageImports` for faster builds
- **Caching**: Turborepo caching speeds up CI/CD
- **Bundle splitting**: Optimizes client-side performance

### Security Considerations

- Environment variables are secure in Vercel
- CORS headers configured for API routes
- No sensitive data in client bundle
- Supabase RLS policies handle data security

## Alternative Deployment Platforms

### Docker Deployment
```dockerfile
# Example Dockerfile for container deployment
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:production
EXPOSE 3000
CMD ["npm", "start"]
```

### Static Export (if needed)
```js
// next.config.ts - add for static export
export default {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
}
```

## Monitoring & Analytics

- **Vercel Analytics**: Automatically enabled
- **Performance monitoring**: Available in Vercel dashboard
- **Error tracking**: Consider adding Sentry integration
- **Uptime monitoring**: Consider external monitoring service

## Scaling Considerations

- **Serverless functions**: Vercel handles auto-scaling
- **Database**: Supabase scales automatically
- **CDN**: Vercel provides global CDN
- **Caching**: Implement Redis for high-traffic scenarios
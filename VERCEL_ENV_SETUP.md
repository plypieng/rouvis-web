# Vercel Environment Variables Setup Guide

This guide provides a comprehensive list of all environment variables needed to deploy ROuvis backend and web frontend to Vercel.

## 🚀 Quick Setup Commands

You can use the Vercel CLI to set environment variables directly from your local `.env` files:

```bash
# For Backend (from backend directory)
cd backend
vercel env pull .env.vercel
vercel link
vercel env add < .env

# For Web Frontend (from web directory)
cd web
vercel env pull .env.vercel
vercel link
vercel env add < .env.local
```

## 📦 Backend Environment Variables

### Required for All Environments (Production, Preview, Development)

#### Server Configuration
```bash
vercel env add PORT production preview development
# Value: 4000
```

#### API Keys
```bash
vercel env add OPENAI_API_KEY production preview development
# Your OpenAI API key from backend/.env

vercel env add NEXTAUTH_SECRET production preview development
# Your NextAuth secret from backend/.env (generate with: openssl rand -base64 32)

vercel env add NEXTAUTH_URL production preview development
# Production: https://your-backend-domain.vercel.app
# Preview: https://your-backend-git-dev.vercel.app
# Development: http://localhost:4000
```

#### Database (Vercel Postgres + Prisma Accelerate)
```bash
vercel env add DATABASE_URL production preview development
# Prisma Accelerate URL from backend/.env

vercel env add DIRECT_URL production preview development
# Direct Postgres connection URL for migrations

vercel env add POSTGRES_URL production preview development
# Standard Postgres URL (reference)
```

#### Vector Store & Object Storage
```bash
vercel env add PINECONE_API_KEY production preview development
# Your Pinecone API key

vercel env add PINECONE_INDEX_NAME production preview development
# Value: rouvis-knowledge

vercel env add R2_ACCESS_KEY_ID production preview development
# Cloudflare R2 access key ID

vercel env add R2_SECRET_ACCESS_KEY production preview development
# Cloudflare R2 secret access key

vercel env add R2_BUCKET production preview development
# Value: rouvis-media
```

#### Queue & Cache (Upstash Redis)
```bash
vercel env add UPSTASH_REDIS_REST_URL production preview development
# Your Upstash Redis REST URL

vercel env add UPSTASH_REDIS_REST_TOKEN production preview development
# Your Upstash Redis REST token
```

#### AI Models Configuration
```bash
vercel env add MODEL_DEFAULT production preview development
# Value: chatgpt-5-mini

vercel env add MODEL_VISION production preview development
# Value: chatgpt-5-pro-vision
```

#### Feature Flags
```bash
vercel env add AGENTKIT_ENABLED production preview development
# Value: true

vercel env add NEXT_PUBLIC_API_BASE_URL production preview development
# Production: https://your-backend-domain.vercel.app
# Preview: https://your-backend-git-dev.vercel.app
# Development: http://localhost:4000
```

---

## 🌐 Web Frontend Environment Variables

### Required for All Environments (Production, Preview, Development)

#### Backend API Configuration
```bash
vercel env add NEXT_PUBLIC_API_BASE_URL production preview development
# Production: https://your-backend-domain.vercel.app
# Preview: https://your-backend-git-dev.vercel.app
# Development: http://localhost:4000
```

#### Feature Flags
```bash
vercel env add USE_AGENTS production preview development
# Value: true
```

#### ChatKit Configuration (Custom Backend Mode)
```bash
vercel env add NEXT_PUBLIC_CHATKIT_DOMAIN_KEY production preview development
# Production: rouvis-production
# Preview: rouvis-preview
# Development: rouvis-local-dev
```

#### Storage (Cloudflare R2)
```bash
vercel env add R2_ACCESS_KEY_ID production preview development
# Same as backend R2_ACCESS_KEY_ID

vercel env add R2_SECRET_ACCESS_KEY production preview development
# Same as backend R2_SECRET_ACCESS_KEY
```

---

## 📋 Complete Variable Reference

### Backend Variables Summary
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4000 | Server port |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for AgentKit |
| `NEXTAUTH_SECRET` | Yes | - | NextAuth.js secret (32+ chars) |
| `NEXTAUTH_URL` | Yes | - | Base URL for authentication |
| `DATABASE_URL` | Yes | - | Prisma Accelerate connection URL |
| `DIRECT_URL` | Yes | - | Direct Postgres URL for migrations |
| `POSTGRES_URL` | Yes | - | Standard Postgres URL |
| `PINECONE_API_KEY` | Yes | - | Pinecone vector database API key |
| `PINECONE_INDEX_NAME` | Yes | rouvis-knowledge | Pinecone index name |
| `R2_ACCESS_KEY_ID` | Yes | - | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | - | Cloudflare R2 secret key |
| `R2_BUCKET` | Yes | rouvis-media | R2 bucket name |
| `UPSTASH_REDIS_REST_URL` | Yes | - | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | - | Upstash Redis REST token |
| `MODEL_DEFAULT` | Yes | chatgpt-5-mini | Default OpenAI model |
| `MODEL_VISION` | Yes | chatgpt-5-pro-vision | Vision-capable model |
| `AGENTKIT_ENABLED` | No | true | Enable OpenAI AgentKit |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | - | Backend API URL |

### Web Frontend Variables Summary
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | - | Backend API URL (must be public) |
| `USE_AGENTS` | No | true | Enable multi-agent features |
| `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY` | Yes | - | Domain verification key for ChatKit |
| `R2_ACCESS_KEY_ID` | Yes | - | Cloudflare R2 access key (same as backend) |
| `R2_SECRET_ACCESS_KEY` | Yes | - | Cloudflare R2 secret key (same as backend) |

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Use different keys for production vs preview** - Especially for `NEXTAUTH_SECRET`
3. **Rotate secrets regularly** - Update API keys every 90 days
4. **Use Vercel's encrypted environment variables** - They're encrypted at rest
5. **Limit environment variable scope** - Only add to environments where needed

---

## 📝 Environment-Specific Values

### Production
- `NEXTAUTH_URL`: `https://backend.rouvis.com` (or your domain)
- `NEXT_PUBLIC_API_BASE_URL`: `https://backend.rouvis.com`
- `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY`: `rouvis-production`

### Preview (Git Branch Deployments)
- `NEXTAUTH_URL`: `https://rouvis-backend-git-<branch>.vercel.app`
- `NEXT_PUBLIC_API_BASE_URL`: `https://rouvis-backend-git-<branch>.vercel.app`
- `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY`: `rouvis-preview`

### Development (Local)
- `NEXTAUTH_URL`: `http://localhost:4000`
- `NEXT_PUBLIC_API_BASE_URL`: `http://localhost:4000`
- `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY`: `rouvis-local-dev`

---

## 🛠️ Setting Variables via Vercel Dashboard

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. For each variable:
   - Enter the **Key** (variable name)
   - Enter the **Value** (from your local `.env` files)
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**

---

## 🧪 Testing After Deployment

### Backend Health Check
```bash
curl https://your-backend-domain.vercel.app/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-23T..."
}
```

### Frontend Check
```bash
# Visit in browser
https://your-web-domain.vercel.app

# Check if ChatKit loads
# Open DevTools Console - should see no errors
```

### Test Chat Integration
1. Open the web app
2. Navigate to チャット (Chat) page
3. Send a test message: "今日は何をすればいいですか？"
4. Verify you receive a streaming response

---

## 🔄 Syncing Local with Vercel

Pull production environment variables to local:
```bash
# Backend
cd backend
vercel env pull .env.production

# Web
cd web
vercel env pull .env.production
```

---

## 📚 Related Documentation

- [Vercel Environment Variables Docs](https://vercel.com/docs/environment-variables)
- [Prisma Accelerate Setup](https://www.prisma.io/docs/accelerate)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [OpenAI ChatKit Custom Backend](https://openai.github.io/chatkit-js/)

---

## ✅ Pre-Deployment Checklist

- [ ] All environment variables added to Vercel
- [ ] Backend builds successfully (`npm run build` in backend/)
- [ ] Web frontend builds successfully (`npm run build` in web/)
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Health endpoint returns 200
- [ ] ChatKit UI loads without errors
- [ ] Test chat message completes successfully
- [ ] Japanese localization displays correctly

---

## 🐛 Troubleshooting

### "NEXTAUTH_URL not set" error
Make sure `NEXTAUTH_URL` matches your deployment domain exactly.

### "Database connection failed"
- Check `DATABASE_URL` is correct
- Verify Prisma Accelerate API key is valid
- Run migrations: `npx prisma migrate deploy`

### "ChatKit not loading"
- Verify `NEXT_PUBLIC_API_BASE_URL` is accessible from browser
- Check `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY` is set
- Ensure ChatKit script tag is in layout.tsx

### "401 Unauthorized on /api/v1/chat/stream"
- This endpoint requires authentication
- For testing, use `x-user-id: demo-user` header
- In production, implement proper NextAuth.js session

---

## 📞 Support

If you encounter issues during Vercel deployment:
1. Check Vercel deployment logs
2. Review environment variables in Vercel dashboard
3. Test endpoints with `curl` or Postman
4. Check browser DevTools console for errors

---

**Generated:** 2025-10-23
**Last Updated:** 2025-10-23

# Deploying TruthChain Backend to Render

## Quick Setup

### Option 1: Using render.yaml (Recommended)

1. Connect your GitHub repository to Render
2. Render will automatically detect `render.yaml` in the `backend/` directory
3. Configure environment variables in Render dashboard

### Option 2: Manual Setup

1. **Create a new Web Service** on Render
2. **Connect your GitHub repository**
3. **Configure the service:**
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

## Build & Start Commands

```json
{
  "build": "tsc",
  "start": "node dist/index.js"
}
```

- **Build**: Compiles TypeScript to JavaScript in `dist/` folder
- **Start**: Runs the compiled JavaScript server

## Required Environment Variables

Add these in Render Dashboard → Environment:

```bash
# Walrus (Testnet)
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space/v1
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space/v1

# Sui Blockchain
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PACKAGE_ID=your_package_id_here
REGISTRY_OBJECT_ID=your_registry_object_id_here
SUI_PRIVATE_KEY=your_private_key_here

# Network
SUI_NETWORK=testnet

# Port (Render sets this automatically, but you can override)
PORT=10000
```

## Health Check

The service includes a health check endpoint:
- **URL**: `https://your-service.onrender.com/health`
- **Response**: `{ "status": "healthy", "timestamp": "..." }`

## API Endpoints

Once deployed, your API will be available at:
- `https://your-service.onrender.com/v1/register`
- `https://your-service.onrender.com/v1/verify`
- `https://your-service.onrender.com/v1/config`
- `https://your-service.onrender.com/v1/info`

## Troubleshooting

### Build Fails
- Check that TypeScript compiles: `npm run build` locally
- Ensure all dependencies are in `package.json`

### Server Won't Start
- Check environment variables are set correctly
- Verify `dist/index.js` exists after build
- Check Render logs for errors

### Port Issues
- Render automatically sets `PORT` environment variable
- The app uses `process.env.PORT || 3000` (fallback to 3000)

## Update Frontend API URL

After deployment, update your frontend to use the Render URL:

```javascript
// frontend/src/components/RegisterSection.jsx
const API_BASE = 'https://your-service.onrender.com/v1';
```


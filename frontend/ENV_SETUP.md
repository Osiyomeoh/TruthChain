# Frontend Environment Variables

## Quick Setup

Create a `.env` file in the `frontend/` directory with the following variables:

```bash
# Backend API URL
VITE_API_BASE_URL=https://truthchain-drow.onrender.com

# Sui Network (for wallet connection)
VITE_SUI_NETWORK=testnet

# Keep-alive interval (in minutes)
VITE_KEEP_ALIVE_INTERVAL=10
```

## Environment Variables

### `VITE_API_BASE_URL` (Optional)

- **Description**: Backend API base URL
- **Default**: 
  - Production: `https://truthchain-drow.onrender.com`
  - Development: `http://localhost:3000`
- **Example**: `https://truthchain-drow.onrender.com`
- **Note**: Don't include `/v1` - it's added automatically

### `VITE_SUI_NETWORK` (Optional)

- **Description**: Sui blockchain network for wallet connections
- **Default**: `testnet`
- **Options**: `testnet`, `mainnet`, `devnet`, `localnet`
- **Example**: `VITE_SUI_NETWORK=testnet`

### `VITE_KEEP_ALIVE_INTERVAL` (Optional)

- **Description**: Interval in minutes for pinging backend to keep it alive
- **Default**: `10` minutes
- **Note**: Render spins down after 15 minutes, so keep this under 15
- **Example**: `VITE_KEEP_ALIVE_INTERVAL=10`

## Usage

### Development

For local development, you can either:

1. **Use defaults** (no .env needed):
   - API: `http://localhost:3000`
   - Network: `testnet`

2. **Create `.env` file**:
   ```bash
   VITE_API_BASE_URL=http://localhost:3000
   VITE_SUI_NETWORK=testnet
   ```

### Production

For production builds, create `.env.production`:

```bash
VITE_API_BASE_URL=https://truthchain-drow.onrender.com
VITE_SUI_NETWORK=testnet
VITE_KEEP_ALIVE_INTERVAL=10
```

## Important Notes

1. **Vite Prefix**: All environment variables must start with `VITE_` to be accessible in the frontend
2. **Build Time**: Environment variables are embedded at build time, not runtime
3. **Security**: Never commit `.env` files with secrets (already in `.gitignore`)
4. **Restart Required**: After changing `.env`, restart the dev server

## Example .env File

```bash
# Backend API Configuration
VITE_API_BASE_URL=https://truthchain-drow.onrender.com

# Sui Blockchain Network
VITE_SUI_NETWORK=testnet

# Keep-Alive Configuration
VITE_KEEP_ALIVE_INTERVAL=10
```

## Accessing in Code

Environment variables are accessed via `import.meta.env`:

```javascript
// In your code
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const network = import.meta.env.VITE_SUI_NETWORK;
```

Or use the config file:
```javascript
import { API_BASE, SUI_NETWORK } from './config/api';
```

## Current Configuration

The frontend uses these defaults if no `.env` file exists:

- **API URL**: Auto-detects based on build mode (production vs development)
- **Network**: `testnet`
- **Keep-Alive**: 10 minutes


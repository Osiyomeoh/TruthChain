# Keep-Alive for Render Free Tier

Render's free tier automatically spins down services after **15 minutes of inactivity**. To keep your backend alive, use one or more of these methods:

## Method 1: Frontend Keep-Alive (Automatic) ✅

The frontend automatically pings the backend every **10 minutes** when users have the app open.

- **Location**: `frontend/src/services/keepAlive.js`
- **Interval**: 10 minutes
- **Endpoint**: `/health`
- **Status**: Active when frontend is loaded

This works automatically - no configuration needed!

## Method 2: External Monitoring Service (Recommended for 24/7) 🎯

For 24/7 uptime, use an external service to ping your backend:

### Option A: UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Sign up for free account
3. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://truthchain-drow.onrender.com/health`
   - **Interval**: 10 minutes (or 5 minutes for paid)
   - **Alert Contacts**: Your email

### Option B: cron-job.org (Free)

1. Go to https://cron-job.org
2. Sign up for free account
3. Create a new cron job:
   - **URL**: `https://truthchain-drow.onrender.com/health`
   - **Schedule**: `*/10 * * * *` (every 10 minutes)
   - **Method**: GET

### Option C: EasyCron (Free Tier)

1. Go to https://www.easycron.com
2. Sign up for free account
3. Create a cron job:
   - **URL**: `https://truthchain-drow.onrender.com/health`
   - **Schedule**: Every 10 minutes

## Method 3: Browser Extension Keep-Alive

The browser extension also pings the backend when active:
- **Location**: `browser-extension/src/background.js`
- **Interval**: When extension is used

## Health Endpoint

All keep-alive services ping this endpoint:
```
GET https://truthchain-drow.onrender.com/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Recommended Setup

For best results, use **both**:
1. ✅ Frontend keep-alive (automatic when users visit)
2. ✅ External monitoring service (UptimeRobot recommended) for 24/7 coverage

## Render Free Tier Limits

- **Spin-down time**: 15 minutes of inactivity
- **Cold start**: ~30-60 seconds after spin-down
- **Monthly hours**: 750 hours free (enough for 24/7 if kept alive)

## Testing Keep-Alive

Test your keep-alive setup:
```bash
# Test health endpoint
curl https://truthchain-drow.onrender.com/health

# Should return: {"status":"healthy","timestamp":"..."}
```

## Troubleshooting

### Backend Still Spinning Down?

1. **Check external service**: Verify UptimeRobot/cron-job is actually pinging
2. **Check interval**: Must be less than 15 minutes (recommend 10 minutes)
3. **Check endpoint**: Ensure `/health` endpoint is accessible
4. **Check logs**: View Render logs to see if pings are received

### First Request After Spin-Down is Slow?

This is normal! Render free tier has a "cold start" that takes 30-60 seconds. Subsequent requests are fast.


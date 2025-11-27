import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';
import { isSealEnabled, getSealConfig } from './services/seal';

dotenv.config();

// Debug: Log environment variables (remove sensitive data in production)
console.log('Environment check:');
console.log('WALRUS_PUBLISHER_URL:', process.env.WALRUS_PUBLISHER_URL ? '✓ Set' : '✗ Missing');
console.log('WALRUS_AGGREGATOR_URL:', process.env.WALRUS_AGGREGATOR_URL ? '✓ Set' : '✗ Missing');

// Initialize and verify Seal configuration on startup
console.log('\n🔐 [STARTUP] Checking Seal configuration...');
const sealConfig = getSealConfig();
if (sealConfig.enabled) {
  console.log('   ✅ Seal is ENABLED and configured');
  console.log(`   📦 Package ID: ${sealConfig.packageId?.substring(0, 20)}...`);
  console.log(`   🔑 Key servers: ${sealConfig.keyServers?.length || 0}`);
  console.log(`   📊 Threshold: ${sealConfig.threshold}`);
  console.log('   💡 Seal encryption will be used when creator address is provided');
} else {
  console.log('   ⚠️ Seal is DISABLED');
  console.log('   💡 To enable Seal: Set SEAL_ENABLED=true and configure SEAL_PACKAGE_ID, SEAL_KEY_SERVERS in .env');
}

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Request logging middleware (before body parsing)
app.use((req, res, next) => {
  if (req.path.startsWith('/v1/register') || req.path.startsWith('/v1/verify')) {
    console.log('\n' + '='.repeat(80));
    console.log(`📥 [REQUEST] ${req.method} ${req.path}`);
    console.log(`   📋 [REQUEST] Timestamp: ${new Date().toISOString()}`);
    console.log(`   📋 [REQUEST] Origin: ${req.headers.origin || 'N/A'}`);
    console.log(`   📋 [REQUEST] Content-Type: ${req.headers['content-type'] || 'N/A'}`);
    if (req.method === 'POST' && req.path === '/v1/register') {
      console.log(`   📋 [REQUEST] Body will be parsed next...`);
    }
    console.log('='.repeat(80));
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Register API routes
registerRoutes(app);

// Start server
app.listen(port, () => {
  console.log(`🚀 TruthChain API running on port ${port}`);
  console.log(`📡 Network: ${process.env.SUI_NETWORK}`);
  console.log(`🔗 Sui RPC: ${process.env.SUI_RPC_URL}`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST /v1/register - Register media with Seal encryption`);
  console.log(`   POST /v1/verify - Verify media hash`);
  console.log(`   GET  /v1/seal/status - Check Seal configuration`);
  console.log(`\n💡 Ready to receive registration requests!\n`);
});
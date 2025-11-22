import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';

dotenv.config();

// Debug: Log environment variables (remove sensitive data in production)
console.log('Environment check:');
console.log('WALRUS_PUBLISHER_URL:', process.env.WALRUS_PUBLISHER_URL ? '✓ Set' : '✗ Missing');
console.log('WALRUS_AGGREGATOR_URL:', process.env.WALRUS_AGGREGATOR_URL ? '✓ Set' : '✗ Missing');

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
});
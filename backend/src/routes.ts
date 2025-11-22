import { Express, Request, Response } from 'express';
import { 
  registerMedia, 
  verifyMedia, 
  searchAttestations,
  getVerificationStats,
  getAttestationsByCreator
} from './controllers/attestation';
import { getCreatorReputation } from './services/reputation';
import { packageExtension } from './services/extensionPackage';

export function registerRoutes(app: Express) {
  // API v1 routes
  app.post('/v1/register', registerMedia);
  app.post('/v1/verify', verifyMedia);
  
  // Nautilus search endpoints
  app.get('/v1/search', searchAttestations);
  app.get('/v1/stats', getVerificationStats);
  app.get('/v1/creator/:creator', getAttestationsByCreator);
  
  // Reputation endpoint
  app.get('/v1/reputation/:address', (req, res) => {
    try {
      const address = req.params.address;
      const reputation = getCreatorReputation(address);
      res.json({
        success: true,
        address,
        reputation: {
          score: reputation.reputationScore,
          isTrusted: reputation.isTrusted,
          totalRegistrations: reputation.totalRegistrations,
          verifiedRegistrations: reputation.verifiedRegistrations,
          challenges: reputation.challenges,
          successfulChallenges: reputation.successfulChallenges,
          lastRegistration: reputation.lastRegistration
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get reputation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Config endpoint for frontend
  app.get('/v1/config', (req, res) => {
    res.json({
      packageId: process.env.PACKAGE_ID || '',
      registryObjectId: process.env.REGISTRY_OBJECT_ID || '',
      suiRpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
      network: process.env.SUI_RPC_URL?.includes('testnet') ? 'testnet' : 'mainnet'
    });
  });
  
  // Proxy endpoint for fetching media (bypasses CORS)
  app.get('/v1/proxy', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `HTTP ${response.status}` });
      }
      
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Proxy fetch error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Proxy fetch failed' });
    }
  });
  
  // Extension download endpoint
  app.get('/v1/extension/download', async (req, res) => {
    try {
      console.log('📦 Packaging browser extension for download...');
      const zipBuffer = await packageExtension();
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="truthchain-extension.zip"');
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      console.log(`✅ Extension packaged successfully (${zipBuffer.length} bytes)`);
      res.send(zipBuffer);
    } catch (error) {
      console.error('❌ Failed to package extension:', error);
      res.status(500).json({
        error: 'Failed to package extension',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Info endpoint
  app.get('/v1/info', (req, res) => {
    res.json({
      name: 'TruthChain API',
      version: '1.0.0',
      network: process.env.SUI_NETWORK || 'testnet',
      technologies: ['Walrus', 'Seal', 'Nautilus', 'Sui'],
      endpoints: {
        register: 'POST /v1/register',
        verify: 'POST /v1/verify',
        search: 'GET /v1/search?creator=...&source=...',
        stats: 'GET /v1/stats',
        creator: 'GET /v1/creator/:creator',
        proxy: 'GET /v1/proxy?url=...',
        extension: 'GET /v1/extension/download'
      }
    });
  });
}
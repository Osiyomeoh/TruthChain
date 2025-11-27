/**
 * Seal Setup Script
 * 
 * This script helps you configure Seal with existing Testnet key servers
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const SEAL_PACKAGE_ID_TESTNET = '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682';
const ENV_FILE = path.join(__dirname, '.env');

interface SealConfig {
  enabled: boolean;
  packageId: string;
  threshold: number;
  keyServers: string[];
}

function readEnvFile(): Map<string, string> {
  const env = new Map<string, string>();
  
  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env.set(key.trim(), valueParts.join('=').trim());
        }
      }
    }
  }
  
  return env;
}

function writeEnvFile(env: Map<string, string>) {
  const lines: string[] = [];
  
  // Preserve existing entries
  for (const [key, value] of env.entries()) {
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf-8');
}

async function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupSeal() {
  console.log('🔧 Seal Configuration Setup\n');
  console.log('='.repeat(70));
  console.log('This script will help you configure Seal for TruthChain');
  console.log('='.repeat(70));
  console.log();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  try {
    // Check if .env exists
    const env = readEnvFile();
    
    console.log('📋 Current Configuration:');
    console.log(`   SEAL_ENABLED: ${env.get('SEAL_ENABLED') || 'not set'}`);
    console.log(`   SEAL_PACKAGE_ID: ${env.get('SEAL_PACKAGE_ID') || 'not set'}`);
    console.log(`   SEAL_THRESHOLD: ${env.get('SEAL_THRESHOLD') || 'not set'}`);
    console.log(`   SEAL_KEY_SERVERS: ${env.get('SEAL_KEY_SERVERS') ? 'set' : 'not set'}`);
    console.log();
    
    // Ask if user wants to enable Seal
    const enableSeal = await askQuestion(rl, 'Enable Seal? (y/n, default: n): ');
    
    if (enableSeal.toLowerCase() !== 'y' && enableSeal.toLowerCase() !== 'yes') {
      console.log('\n✅ Seal will remain disabled. TruthChain works perfectly without it!');
      rl.close();
      return;
    }
    
    // Get key server object IDs
    console.log('\n📝 Key Server Configuration');
    console.log('='.repeat(70));
    console.log('You need to provide key server object IDs from Sui Testnet.');
    console.log('Find them using:');
    console.log('  1. Seal documentation: https://seal-docs.wal.app/');
    console.log('  2. Sui Explorer: https://suiexplorer.com/');
    console.log('  3. Run: npx ts-node find-testnet-key-servers.ts');
    console.log();
    
    const keyServersInput = await askQuestion(
      rl,
      'Enter key server object IDs (comma-separated, format: 0x...:1,0x...:1): '
    );
    
    if (!keyServersInput) {
      console.log('\n❌ No key servers provided. Seal setup cancelled.');
      rl.close();
      return;
    }
    
    // Parse threshold
    const thresholdInput = await askQuestion(
      rl,
      `Enter threshold (default: 2, must be <= number of key servers): `
    );
    const threshold = thresholdInput ? parseInt(thresholdInput, 10) : 2;
    
    // Validate threshold
    const keyServerCount = keyServersInput.split(',').length;
    if (threshold > keyServerCount) {
      console.log(`\n⚠️  Warning: Threshold (${threshold}) > key servers (${keyServerCount}). Setting to ${keyServerCount}.`);
      threshold = keyServerCount;
    }
    
    // Update .env
    env.set('SEAL_ENABLED', 'true');
    env.set('SEAL_PACKAGE_ID', SEAL_PACKAGE_ID_TESTNET);
    env.set('SEAL_THRESHOLD', threshold.toString());
    env.set('SEAL_KEY_SERVERS', keyServersInput);
    
    // Optional settings
    const verifyServers = await askQuestion(
      rl,
      'Verify key servers on-chain? (y/n, default: y): '
    );
    env.set('SEAL_VERIFY_KEY_SERVERS', 
      (verifyServers.toLowerCase() !== 'n' && verifyServers.toLowerCase() !== 'no') ? 'true' : 'false'
    );
    
    const timeout = await askQuestion(
      rl,
      'Request timeout in ms (default: 30000): '
    );
    env.set('SEAL_TIMEOUT', timeout || '30000');
    
    // Write to .env
    writeEnvFile(env);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Configuration saved to .env');
    console.log('='.repeat(70));
    console.log('\n📋 Configuration Summary:');
    console.log(`   SEAL_ENABLED: true`);
    console.log(`   SEAL_PACKAGE_ID: ${SEAL_PACKAGE_ID_TESTNET}`);
    console.log(`   SEAL_THRESHOLD: ${threshold}`);
    console.log(`   SEAL_KEY_SERVERS: ${keyServersInput}`);
    console.log(`   SEAL_VERIFY_KEY_SERVERS: ${env.get('SEAL_VERIFY_KEY_SERVERS')}`);
    console.log(`   SEAL_TIMEOUT: ${env.get('SEAL_TIMEOUT')}`);
    console.log();
    console.log('🚀 Next Steps:');
    console.log('   1. Restart your backend: npm run dev');
    console.log('   2. Test Seal: npx ts-node test-seal-final.ts');
    console.log();
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    rl.close();
  }
}

setupSeal().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});


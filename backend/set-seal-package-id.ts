/**
 * Set Seal Package ID - Tests and updates .env if package ID works
 * Usage: npx ts-node set-seal-package-id.ts <package_id>
 */

import { encryptWithSeal } from './src/services/seal';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAndSetPackageId(packageId: string) {
  console.log(`\n🧪 Testing Package ID: ${packageId}\n`);
  console.log('='.repeat(70));
  
  // Update .env temporarily
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Update SEAL_PACKAGE_ID
  if (envContent.includes('SEAL_PACKAGE_ID=')) {
    envContent = envContent.replace(
      /SEAL_PACKAGE_ID=.*/,
      `SEAL_PACKAGE_ID=${packageId}`
    );
  } else {
    envContent += `\nSEAL_PACKAGE_ID=${packageId}\n`;
  }
  
  // Write temporarily (we'll revert if it fails)
  const originalEnv = fs.readFileSync(envPath, 'utf-8');
  fs.writeFileSync(envPath, envContent);
  
  // Reload env
  delete require.cache[require.resolve('dotenv')];
  dotenv.config({ override: true });
  
  try {
    // Test encryption
    const testData = 'test data for Seal';
    const testIdentity = '0x1234567890123456789012345678901234567890123456789012345678901234';
    
    const result = await encryptWithSeal(testData, testIdentity);
    
    if (result) {
      console.log('   ✅ Encryption successful!');
      console.log(`   Encrypted object size: ${result.encryptedObject.length} bytes`);
      console.log(`   Session key size: ${result.sessionKey.length} bytes`);
      console.log(`\n🎉 Package ID works!`);
      console.log(`\n✅ Updated .env file with:`);
      console.log(`   SEAL_PACKAGE_ID=${packageId}\n`);
      return true;
    } else {
      console.log('   ❌ Encryption returned null');
      fs.writeFileSync(envPath, originalEnv);
      return false;
    }
  } catch (error: any) {
    const errorMsg = error?.message || error?.requestId || String(error);
    console.log(`   ❌ Encryption failed`);
    
    if (errorMsg.includes('not the first version') || errorMsg.includes('InvalidPackageError')) {
      console.log(`   Error: Package is not the first version`);
      console.log(`   This package ID is an upgraded version, not the original.`);
    } else {
      console.log(`   Error: ${errorMsg.substring(0, 150)}`);
    }
    
    // Revert .env
    fs.writeFileSync(envPath, originalEnv);
    return false;
  }
}

async function main() {
  const packageId = process.argv[2];
  
  if (!packageId) {
    console.log('\n❌ Usage: npx ts-node set-seal-package-id.ts <package_id>');
    console.log('\nExample:');
    console.log('  npx ts-node set-seal-package-id.ts 0x1234...');
    console.log('\nTo find the package ID:');
    console.log('  1. Go to: https://suiscan.xyz/testnet/object/0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682');
    console.log('  2. Click "Transactions" tab');
    console.log('  3. Find the OLDEST transaction (Publish)');
    console.log('  4. Get the package ID from that transaction');
    console.log('  5. Run this script with that package ID\n');
    process.exit(1);
  }
  
  const packageIdClean = packageId.trim();
  if (!packageIdClean.startsWith('0x') || packageIdClean.length !== 66) {
    console.log('\n❌ Invalid package ID format');
    console.log('   Package ID should start with 0x and be 66 characters long');
    console.log(`   Got: ${packageIdClean} (${packageIdClean.length} chars)\n`);
    process.exit(1);
  }
  
  const success = await testAndSetPackageId(packageIdClean);
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});



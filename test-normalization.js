#!/usr/bin/env node

/**
 * TruthChain Image Normalization Test
 * 
 * Tests that the same image content produces the same hash regardless of format.
 * Compares a URL image (likely JPEG) with a downloaded AVIF file.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'https://plus.unsplash.com/premium_photo-1675865395171-4152ba93d11c?q=80&w=1625&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const LOCAL_FILE = path.join(__dirname, 'frontend/src/utils/test6.avif');

async function runTest() {
  console.log('🧪 TruthChain Image Normalization Test\n');
  console.log('='.repeat(60));
  
  // Check if local file exists
  if (!fs.existsSync(LOCAL_FILE)) {
    console.error(`❌ Local file not found: ${LOCAL_FILE}`);
    process.exit(1);
  }
  
  console.log(`📥 URL: ${TEST_URL}`);
  console.log(`📁 Local File: ${LOCAL_FILE}`);
  console.log('='.repeat(60));
  console.log('\n🚀 Starting browser...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Inject normalization and hashing functions
    await page.evaluateOnNewDocument(() => {
      window.normalizeImage = async function(blob) {
        if (!blob.type.startsWith('image/')) {
          return blob;
        }
        
        try {
          const imageUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          const loadedImg = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
            img.onload = () => {
              clearTimeout(timeout);
              resolve(img);
            };
            img.onerror = reject;
            img.src = imageUrl;
          });
          
          URL.revokeObjectURL(imageUrl);
          
          const canvas = document.createElement('canvas');
          const naturalWidth = loadedImg.naturalWidth || loadedImg.width;
          const naturalHeight = loadedImg.naturalHeight || loadedImg.height;
          
          if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
            throw new Error(`Invalid dimensions: ${naturalWidth}x${naturalHeight}`);
          }
          
          canvas.width = naturalWidth;
          canvas.height = naturalHeight;
          
          const ctx = canvas.getContext('2d', { 
            willReadFrequently: false,
            alpha: false,
            desynchronized: false,
            colorSpace: 'srgb'
          });
          
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);
          
          const normalizedBlob = await new Promise((resolve) => {
            canvas.toBlob((normalized) => {
              if (!normalized) {
                resolve(blob);
                return;
              }
              resolve(new Blob([normalized], { type: 'image/png' }));
            }, 'image/png', 1.0);
          });
          
          return normalizedBlob || blob;
        } catch (error) {
          console.warn('Normalization failed:', error.message);
          return blob;
        }
      };
      
      window.calculateHash = async function(blob) {
        const normalizedBlob = await window.normalizeImage(blob);
        const arrayBuffer = await normalizedBlob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      };
    });
    
    // Test 1: Fetch and hash URL image
    console.log('1️⃣ Fetching image from URL...');
    const urlResponse = await page.goto(TEST_URL);
    if (!urlResponse.ok()) {
      throw new Error(`Failed to fetch URL: ${urlResponse.status()}`);
    }
    
    const urlBlob = await page.evaluate(async (url) => {
      const response = await fetch(url);
      return await response.blob();
    }, TEST_URL);
    
    console.log(`   ✅ Fetched: ${urlBlob.type}, ${(urlBlob.size / 1024).toFixed(2)} KB`);
    
    console.log('   🔄 Normalizing URL image...');
    const urlHash = await page.evaluate(async (blobData) => {
      const blob = new Blob([new Uint8Array(blobData.data)], { type: blobData.type });
      return await window.calculateHash(blob);
    }, {
      data: Array.from(new Uint8Array(await urlBlob.arrayBuffer())),
      type: urlBlob.type
    });
    
    console.log(`   ✅ URL Hash: ${urlHash}\n`);
    
    // Test 2: Read and hash local file
    console.log('2️⃣ Reading local file...');
    const fileBuffer = fs.readFileSync(LOCAL_FILE);
    const fileStats = fs.statSync(LOCAL_FILE);
    
    console.log(`   📁 File: ${path.basename(LOCAL_FILE)} (${(fileStats.size / 1024).toFixed(2)} KB)`);
    
    console.log('   🔄 Normalizing local file...');
    const fileHash = await page.evaluate(async (fileData) => {
      const blob = new Blob([new Uint8Array(fileData)], { type: 'image/avif' });
      return await window.calculateHash(blob);
    }, Array.from(fileBuffer));
    
    console.log(`   ✅ File Hash: ${fileHash}\n`);
    
    // Compare
    console.log('3️⃣ Comparing hashes...');
    console.log('='.repeat(60));
    console.log(`URL Hash:  ${urlHash}`);
    console.log(`File Hash: ${fileHash}`);
    console.log('='.repeat(60));
    
    const match = urlHash === fileHash;
    
    if (match) {
      console.log('\n✅ SUCCESS! Hashes MATCH!');
      console.log('✅ The same image content produces the same hash regardless of format.');
      console.log('✅ Normalization is working correctly!\n');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED! Hashes do NOT match.');
      console.log('⚠️  This could mean:');
      console.log('   • The images are actually different (different quality/compression)');
      console.log('   • The URL serves a different image than the downloaded file');
      console.log('   • Normalization needs further refinement\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  runTest();
} catch (e) {
  console.error('❌ Puppeteer is not installed.');
  console.error('   Please install it with: npm install puppeteer --save-dev');
  process.exit(1);
}


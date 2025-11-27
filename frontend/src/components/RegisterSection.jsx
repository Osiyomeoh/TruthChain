import React, { useState, useEffect } from 'react'
import { useCurrentWallet, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { registerMediaWithWallet } from '../utils/walletRegistration'
import { API_BASE } from '../config/api'
import './RegisterSection.css'
import './Button.css'

function RegisterSection() {
  const { isConnected } = useCurrentWallet()
  const currentAccount = useCurrentAccount()
  // Get address from currentAccount (more reliable than useCurrentWallet's address)
  const address = currentAccount?.address
  
  // Debug: Log wallet connection status
  useEffect(() => {
    console.log('[FRONTEND] Wallet status:', {
      isConnected,
      hasAccount: !!currentAccount,
      address: address || 'NOT AVAILABLE',
      addressLength: address?.length || 0
    });
  }, [isConnected, currentAccount, address]);
  const { mutate: signAndExecuteTransaction, isPending: isSigning } = useSignAndExecuteTransaction()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [useWallet, setUseWallet] = useState(false)
  const [config, setConfig] = useState(null)
  const [metadata, setMetadata] = useState({
    source: '',
    mediaType: 'photo',
    isAiGenerated: false
  })

  // Fetch config from backend
  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then(res => res.json())
      .then(data => {
        setConfig(data)
        // Set environment variables for wallet registration
        if (data.packageId && data.registryObjectId) {
          // Update the wallet registration utility
          window.__TRUTHCHAIN_CONFIG__ = data
        }
      })
      .catch(err => console.error('Failed to fetch config:', err))
  }, [])

  // Auto-select wallet mode if connected
  useEffect(() => {
    if (isConnected && !useWallet) {
      setUseWallet(true)
    }
  }, [isConnected])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  /**
   * Normalize image by re-encoding it through canvas to strip metadata
   * This ensures consistent hashing even if metadata differs
   */
  const normalizeImage = async (blob) => {
    // Only normalize images, not videos
    if (!blob.type.startsWith('image/')) {
      console.log('Skipping normalization for non-image blob:', blob.type)
      return blob
    }
    
    
    try {
      // Create image from blob
      const imageUrl = URL.createObjectURL(blob)
      const img = new Image()
      img.crossOrigin = 'anonymous' // Handle CORS for images
      
      const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = (e) => {
          console.error('Image loading error during normalization:', e)
          reject(new Error(`Failed to load image for normalization. Type: ${blob.type}`))
        }
        img.src = imageUrl
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Image loading timed out for normalization')), 30000) // 30 seconds timeout
      )
      
      const loadedImg = await Promise.race([imageLoadPromise, timeoutPromise])
      
      URL.revokeObjectURL(imageUrl) // Clean up object URL immediately
      
      // Create canvas and draw image (this strips metadata)
      // Use natural dimensions for accurate size (not CSS-scaled dimensions)
      const canvas = document.createElement('canvas')
      const naturalWidth = loadedImg.naturalWidth || loadedImg.width
      const naturalHeight = loadedImg.naturalHeight || loadedImg.height
      
      // Ensure valid dimensions
      if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
        throw new Error(`Invalid image dimensions: ${naturalWidth}x${naturalHeight}`)
      }
      
      canvas.width = naturalWidth
      canvas.height = naturalHeight
      
      // Use alpha: false to ensure consistent opaque output (no alpha channel differences)
      const ctx = canvas.getContext('2d', { 
        willReadFrequently: false,
        alpha: false, // No alpha channel for consistent hashing
        desynchronized: false,
        colorSpace: 'srgb' // Standard RGB color space
      })
      
      if (!ctx) {
        throw new Error('Could not get 2D canvas context.')
      }
      
      // Set image smoothing to ensure consistent rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Fill with white background FIRST to ensure consistent opaque images
      // This ensures images with transparency or different backgrounds normalize the same way
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw image (this strips all metadata and normalizes format)
      // Use exact dimensions to avoid any scaling artifacts
      ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height)
      
      // Convert back to blob (normalized, no metadata)
      // Always use PNG format for consistency - this ensures the same image always produces the same hash
      // regardless of original format (JPEG, WebP, AVIF, etc.)
      const normalizedBlob = await new Promise((resolve) => {
        canvas.toBlob((normalized) => {
          if (!normalized) {
            console.warn('Canvas toBlob returned null, using original blob for hashing.')
            resolve(blob)
            return
          }
          const typedBlob = new Blob([normalized], { type: 'image/png' })
          console.log('Image normalized successfully. Original dimensions:', loadedImg.naturalWidth, 'x', loadedImg.naturalHeight, 'Normalized dimensions:', canvas.width, 'x', canvas.height, {
            originalType: blob.type,
            originalSize: blob.size,
            normalizedType: typedBlob.type,
            normalizedSize: typedBlob.size
          })
          resolve(typedBlob)
        }, 'image/png', 1.0) // Always use PNG for consistent hashing, max quality
      })
      
      return normalizedBlob || blob // Fallback to original if normalization fails
    } catch (error) {
      console.warn('Failed to normalize image, using original blob for hashing. Error:', error.message)
      // Special handling for AVIF if it's the source of the problem
      if (blob.type === 'image/avif') {
        console.warn('AVIF image normalization failed. This might be due to browser support or canvas limitations.')
      }
      return blob // Fallback to original blob if normalization fails
    }
  }

  const calculateHash = async (blob) => {
    // Normalize image first to strip metadata and ensure consistent hashing
    console.log('Calculating hash for blob type:', blob.type, 'size:', blob.size)
    const normalizedBlob = await normalizeImage(blob)
    console.log('Normalized blob type:', normalizedBlob.type, 'size:', normalizedBlob.size, 'was normalized:', normalizedBlob !== blob)
    const arrayBuffer = await normalizedBlob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log('Calculated hash:', hash)
    return hash
  }

  const extractImageMetadata = async (file) => {
    if (!file.type.startsWith('image/')) {
      return null
    }

    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        const metadata = {
          width: img.width,
          height: img.height,
          format: file.type.split('/')[1] || 'unknown',
          size: file.size
        }
        URL.revokeObjectURL(url)
        resolve(metadata)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      
      img.src = url
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    // Check if wallet is required but not connected
    if (useWallet && !isConnected) {
      setError('Please connect your wallet to register with wallet')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Calculate hash
      const hash = await calculateHash(file)
      
      // Extract image metadata for similarity detection
      const imageMetadata = await extractImageMetadata(file)
      
      const fileMetadata = JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type,
        ...(imageMetadata || {})
      })

      if (useWallet && isConnected) {
        // Wallet-based registration
        try {
          console.log('\n🔐 [FRONTEND] Wallet Registration - Seal Check:');
          console.log(`   📋 [FRONTEND] Wallet connected: ${isConnected}`);
          console.log(`   📋 [FRONTEND] Current account:`, currentAccount);
          console.log(`   📋 [FRONTEND] Wallet address: ${address || 'NOT AVAILABLE'}`);
          console.log(`   📋 [FRONTEND] Creator address will be sent: ${address ? 'YES' : 'NO'}`);
          
          if (!address) {
            console.warn('   ⚠️ [FRONTEND] WARNING: Wallet is connected but address is not available!');
            console.warn('   💡 [FRONTEND] This will prevent Seal encryption from being used.');
          }
          
          // Prepare request body
          const requestBody = {
            hash,
            source: metadata.source || 'Web Interface',
            mediaType: metadata.mediaType,
            isAiGenerated: metadata.isAiGenerated,
            metadata: fileMetadata,
            skipBlockchain: true, // Tell backend to skip blockchain, we'll do it with wallet
            creator: address || undefined, // Include creator address for Seal encryption
            imageMetadata: imageMetadata || undefined // Include image metadata for similarity detection
          };
          
          console.log('   📤 [FRONTEND] Request body being sent:');
          console.log(`      - hash: ${requestBody.hash.substring(0, 16)}...`);
          console.log(`      - creator: ${requestBody.creator || 'undefined'}`);
          console.log(`      - skipBlockchain: ${requestBody.skipBlockchain}`);
          console.log(`   🌐 [FRONTEND] API URL: ${API_BASE}/register`);
          console.log(`   📋 [FRONTEND] Full request URL: ${API_BASE}/register`);
          
          // First, upload to Walrus via backend (we still need this for storage)
          console.log(`   ⏳ [FRONTEND] Sending request to backend...`);
          const walrusResponse = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          })

          if (!walrusResponse.ok) {
            const errorData = await walrusResponse.json()
            throw new Error(errorData.error || 'Walrus upload failed')
          }

          const walrusData = await walrusResponse.json()
          
          // Log Seal encryption info from Walrus upload
          console.log('\n🔐 Seal Encryption Status (Wallet Registration):')
          console.log('   📋 [FRONTEND] Checking backend response for Seal encryption...')
          console.log('   📋 [FRONTEND] Response keys:', Object.keys(walrusData))
          console.log('   📋 [FRONTEND] sealEncryption:', walrusData.sealEncryption)
          console.log('   📋 [FRONTEND] sealEncryptionStatus:', walrusData.sealEncryptionStatus)
          console.log('   📋 [FRONTEND] sealProof present:', !!walrusData.sealProof)
          
          if (walrusData.sealEncryption) {
            console.log('   ✅ Seal encryption was used!')
            console.log('\n   📋 Seal Encryption Details:')
            console.log(`      🔐 Algorithm: BonehFranklinBLS12381 + AES-256-GCM`)
            console.log(`      🆔 Identity (encrypted for): ${walrusData.sealEncryption.identity}`)
            console.log(`      📦 Encrypted object: ${walrusData.sealEncryption.encryptedObject.length} chars (base64)`)
            console.log(`      🔑 Session key: ${walrusData.sealEncryption.sessionKey.length} chars (base64)`)
            console.log(`      💾 Total storage: ${walrusData.sealEncryption.encryptedObject.length + walrusData.sealEncryption.sessionKey.length} chars (base64)`)
            console.log(`      📊 Encrypted object (first 50 chars): ${walrusData.sealEncryption.encryptedObject.substring(0, 50)}...`)
            console.log(`      📊 Session key (first 50 chars): ${walrusData.sealEncryption.sessionKey.substring(0, 50)}...`)
            console.log('      💾 Encrypted metadata stored in Walrus')
            console.log('      🔓 Only you (the creator) can decrypt this data using your wallet')
            console.log('      📝 What this means: Your sensitive metadata (source URL, custom data) is encrypted')
            console.log('      🔒 Security: Uses threshold secret sharing with multiple key servers')
          } else {
            console.log('   ⏭️ Seal encryption not used')
            console.log(`   📋 Status: ${walrusData.sealEncryptionStatus || 'unknown'}`)
            if (walrusData.sealEncryptionStatus === 'disabled') {
              console.log('   💡 Seal is disabled in backend')
              console.log('      Check: SEAL_ENABLED=true in backend .env and restart backend')
            } else if (walrusData.sealEncryptionStatus === 'no_creator') {
              console.log('   💡 Creator address not received by backend')
              console.log('      Check: Backend logs to see if creator address is being received')
            } else if (walrusData.sealEncryptionStatus === 'failed') {
              console.log('   💡 Seal encryption failed')
              console.log('      Check: Backend logs for error details')
            }
            console.log('   📋 Check backend server logs for detailed Seal status')
            console.log('   📋 Or visit: http://localhost:3000/v1/seal/status (if backend is local)')
          }
          if (walrusData.sealProof) {
            console.log(`   📝 Seal proof: ${walrusData.sealProof.algorithm || 'hash-based'}`)
          }

          // Now register on-chain with wallet
          if (!config || !config.packageId || !config.registryObjectId) {
            throw new Error('Contract configuration not loaded. Please refresh the page.')
          }

          // Register on-chain with wallet
          const tx = registerMediaWithWallet(
            {
              hash,
              walrusBlobId: walrusData.walrus_blob_id || walrusData.blobId,
              source: metadata.source || 'Web Interface',
              mediaType: metadata.mediaType,
              isAiGenerated: metadata.isAiGenerated,
              metadata: fileMetadata
            },
            config
          )

          // Ensure transaction is properly initialized
          if (!tx) {
            throw new Error('Transaction object is undefined')
          }

          // Verify transaction is properly created
          if (!tx) {
            throw new Error('Transaction object is undefined')
          }

          await new Promise((resolve, reject) => {
            signAndExecuteTransaction(
              {
                transaction: tx,
                options: {
                  showEffects: true,
                  showEvents: true,
                },
              },
              {
                onSuccess: (result) => {
                  console.log('Wallet transaction executed:', result.digest)
                  
                  // Extract attestation ID and creator from events
                  let attestationId = null
                  let creator = null
                  
                  // Try to get events from the transaction result
                  if (result.events) {
                    for (const event of result.events) {
                      if (event.type && event.type.includes('AttestationCreated')) {
                        const eventData = event.parsedJson || event
                        attestationId = eventData.attestation_id || eventData.attestationId
                        creator = eventData.creator
                        break
                      }
                    }
                  }

                  setResult({
                    hash,
                    attestationId,
                    txDigest: result.digest,
                    creator: creator || address || '',
                    walrus_blob_id: walrusData.walrus_blob_id || walrusData.blobId,
                    method: 'wallet',
                    sealEncryption: walrusData.sealEncryption, // Include Seal encryption info
                    sealProof: walrusData.sealProof // Include Seal proof
                  })
                  resolve()
                },
                onError: (error) => {
                  console.error('Wallet transaction error:', error)
                  
                  // Check for specific error types
                  let errorMessage = error.message || 'Transaction failed'
                  
                  if (errorMessage.includes('No valid gas coins') || 
                      errorMessage.includes('gas') || 
                      errorMessage.includes('insufficient') ||
                      errorMessage.includes('balance')) {
                    errorMessage = 'Insufficient SUI for gas fees. Please add testnet SUI to your wallet.\n\n' +
                      'Get testnet SUI from:\n' +
                      '• Sui Testnet Faucet: https://discord.com/channels/916379725201563759/971488439931392130\n' +
                      '• Or use: https://sui-faucet.com/\n\n' +
                      'Make sure you\'re on Sui Testnet network.'
                  }
                  
                  reject(new Error(errorMessage))
                }
              }
            )
          })
        } catch (err) {
          console.error('Wallet registration error:', err)
          let errorMessage = err.message || 'Failed to register with wallet'
          
          // Format multi-line error messages (from gas errors)
          if (errorMessage.includes('\n')) {
            // Keep the error message as-is for multi-line errors
            setError(errorMessage)
          } else {
            setError(errorMessage)
          }
        }
      } else {
        // Backend-based registration (simpler, no wallet needed)
        console.log('\n🔐 [FRONTEND] Backend Registration - Seal Check:');
        console.log(`   📋 [FRONTEND] Wallet connected: ${isConnected}`);
        console.log(`   📋 [FRONTEND] Wallet address: ${address || 'NOT AVAILABLE'}`);
        console.log(`   📋 [FRONTEND] Creator address will be sent: ${address ? 'YES' : 'NO'}`);
        
        const requestBody = {
          hash,
          source: metadata.source || 'Web Interface',
          mediaType: metadata.mediaType,
          isAiGenerated: metadata.isAiGenerated,
          metadata: fileMetadata,
          creator: address || undefined, // Include creator address for Seal encryption
          imageMetadata: imageMetadata || undefined // Include image metadata for similarity detection
        };
        
        console.log('   📤 [FRONTEND] Request body being sent:');
        console.log(`      - hash: ${requestBody.hash.substring(0, 16)}...`);
        console.log(`      - creator: ${requestBody.creator || 'undefined'}`);
        console.log(`   🌐 [FRONTEND] API URL: ${API_BASE}/register`);
        console.log(`   📋 [FRONTEND] Full request URL: ${API_BASE}/register`);
        
        console.log(`   ⏳ [FRONTEND] Sending request to backend...`);
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Registration failed')
        }

                const data = await response.json()
                
                // Log Seal encryption info
                console.log('\n🔐 Seal Encryption Status (Backend Registration):')
                console.log('   📋 [FRONTEND] Checking backend response for Seal encryption...')
                console.log('   📋 [FRONTEND] Response keys:', Object.keys(data))
                console.log('   📋 [FRONTEND] sealEncryption:', data.sealEncryption)
                console.log('   📋 [FRONTEND] sealEncryptionStatus:', data.sealEncryptionStatus)
                console.log('   📋 [FRONTEND] sealProof present:', !!data.sealProof)
                
                if (data.sealEncryption) {
                  console.log('   ✅ Seal encryption was used!')
                  console.log('\n   📋 Seal Encryption Details:')
                  console.log(`      🔐 Algorithm: BonehFranklinBLS12381 + AES-256-GCM`)
                  console.log(`      🆔 Identity (encrypted for): ${data.sealEncryption.identity}`)
                  console.log(`      📦 Encrypted object: ${data.sealEncryption.encryptedObject.length} chars (base64)`)
                  console.log(`      🔑 Session key: ${data.sealEncryption.sessionKey.length} chars (base64)`)
                  console.log(`      💾 Total storage: ${data.sealEncryption.encryptedObject.length + data.sealEncryption.sessionKey.length} chars (base64)`)
                  console.log(`      📊 Encrypted object (first 50 chars): ${data.sealEncryption.encryptedObject.substring(0, 50)}...`)
                  console.log(`      📊 Session key (first 50 chars): ${data.sealEncryption.sessionKey.substring(0, 50)}...`)
                  console.log('      💾 Encrypted metadata stored in Walrus')
                  console.log('      🔓 Only you (the creator) can decrypt this data using your wallet')
                  console.log('      📝 What this means: Your sensitive metadata (source URL, custom data) is encrypted')
                  console.log('      🔒 Security: Uses threshold secret sharing with multiple key servers')
                } else {
                  console.log('   ⏭️ Seal encryption not used')
                  console.log(`   📋 Status: ${data.sealEncryptionStatus || 'unknown'}`)
                  if (data.sealEncryptionStatus === 'disabled') {
                    console.log('   💡 Seal is disabled in backend')
                    console.log('      Check: SEAL_ENABLED=true in backend .env and restart backend')
                  } else if (data.sealEncryptionStatus === 'no_creator') {
                    console.log('   💡 Creator address not received by backend')
                    console.log('      Check: Backend logs to see if creator address is being received')
                    console.log('      Tip: Connect your wallet to enable Seal encryption')
                  } else if (data.sealEncryptionStatus === 'failed') {
                    console.log('   💡 Seal encryption failed')
                    console.log('      Check: Backend logs for error details')
                  }
                  console.log('   📋 Check backend server logs for detailed Seal status')
                }
                if (data.sealProof) {
                  console.log(`   📝 Seal proof: ${data.sealProof.algorithm || 'hash-based'}`)
                }
                
                // Show security warnings if any
                if (data.securityWarnings && data.securityWarnings.length > 0) {
                  console.warn('Security warnings:', data.securityWarnings)
                  // Don't set error, but show warnings in result
                }
                
                setResult({
                  ...data,
                  method: 'backend',
                  securityWarnings: data.securityWarnings
                })
      }
    } catch (err) {
      setError(err.message || 'Failed to register media')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="register" className="register-section">
      <div className="register-container">
        <h2 className="section-title">Register Media</h2>
        <p className="section-description">
          Upload an image or video to create an immutable attestation on Sui blockchain. 
          Protect your content from deepfakes and verify authenticity on social media platforms.
        </p>

        <div className="register-content">
          <div className="register-form-container">
            {/* Registration Method Selection */}
            <div className="method-selection">
              <h3 className="method-title">Choose Registration Method</h3>
              <div className="method-options">
                <label className={`method-option ${!useWallet ? 'active' : ''} ${!isConnected ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name="method"
                    checked={!useWallet}
                    onChange={() => setUseWallet(false)}
                    disabled={!isConnected && useWallet}
                  />
                  <div className="method-card">
                    <div className="method-icon">Quick</div>
                    <div className="method-info">
                      <h4>Quick Register</h4>
                      <p>Backend signs transaction • No wallet needed • Free for you</p>
                    </div>
                  </div>
                </label>
                <label className={`method-option ${useWallet ? 'active' : ''} ${!isConnected ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name="method"
                    checked={useWallet}
                    onChange={() => {
                      if (isConnected) {
                        setUseWallet(true)
                      } else {
                        setError('Please connect your wallet first')
                      }
                    }}
                    disabled={!isConnected}
                  />
                  <div className="method-card">
                    <div className="method-icon">Secure</div>
                    <div className="method-info">
                      <h4>Wallet Register</h4>
                      <p>You sign transaction • Full control • You pay gas</p>
                    </div>
                  </div>
                </label>
              </div>
              {!isConnected && useWallet && (
                <div className="method-warning">
                  Connect your wallet to use wallet registration
                </div>
              )}
            </div>

            <form onSubmit={handleRegister} className="register-form">
              <div className="form-group">
                <label htmlFor="file" className="form-label">
                  Select Media File
                </label>
                <input
                  type="file"
                  id="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="file-input"
                  required
                />
                {preview && (
                  <div className="preview-container">
                    <img src={preview} alt="Preview" className="preview-image" />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="source" className="form-label">
                  Source (optional)
                </label>
                <input
                  type="text"
                  id="source"
                  value={metadata.source}
                  onChange={(e) => setMetadata({ ...metadata, source: e.target.value })}
                  className="form-input"
                  placeholder="e.g., My Website, Social Media"
                />
              </div>

              <div className="form-group">
                <label htmlFor="mediaType" className="form-label">
                  Media Type
                </label>
                <select
                  id="mediaType"
                  value={metadata.mediaType}
                  onChange={(e) => setMetadata({ ...metadata, mediaType: e.target.value })}
                  className="form-input"
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="audio">Audio</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={metadata.isAiGenerated}
                    onChange={(e) => setMetadata({ ...metadata, isAiGenerated: e.target.checked })}
                    className="checkbox"
                  />
                  <span>
                    AI Generated Content 
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginLeft: '4px' }}>
                      (auto-detected, can override)
                    </span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !file || (useWallet && !isConnected) || isSigning}
              >
                {loading || isSigning
                  ? (useWallet ? 'Signing Transaction...' : 'Registering...') 
                  : useWallet 
                    ? 'Register with Wallet' 
                    : 'Register on Sui Blockchain'}
              </button>
            </form>
          </div>

                  {error && (
                    <div className="result-card error">
                      <h3>Error</h3>
                      <div className="error-message">
                        {error.split('\n').map((line, idx) => (
                          <p key={idx} style={{ marginBottom: line.startsWith('•') || line.startsWith('Get') ? '4px' : '8px' }}>
                            {line}
                          </p>
                        ))}
                        {error.includes('gas') || error.includes('SUI') ? (
                          <div style={{ marginTop: '12px' }}>
                            <a 
                              href="https://sui-faucet.com/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              Get Testnet SUI →
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {result && (
                    <div className="result-card success">
                      <h3>Registered Successfully</h3>
                      <div className="result-badge">
                        {result.method === 'wallet' ? 'Wallet Signed' : 'Backend Signed'}
                      </div>
                      {result.aiDetection && (
                        <div className="ai-detection-info" style={{
                          marginTop: 'var(--spacing-lg)',
                          padding: 'var(--spacing-md)',
                          background: result.aiDetection.isAiGenerated 
                            ? 'rgba(239, 68, 68, 0.1)' 
                            : 'rgba(16, 185, 129, 0.1)',
                          border: `1px solid ${result.aiDetection.isAiGenerated ? 'var(--color-error)' : 'var(--color-success)'}`,
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)'
                        }}>
                          <strong>
                            {result.aiDetection.isAiGenerated ? '🤖 AI-Generated Content Detected' : '✅ Human-Created Content'}
                          </strong>
                          <p style={{ marginTop: 'var(--spacing-xs)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            Confidence: {result.aiDetection.confidence}% • Method: {result.aiDetection.method}
                          </p>
                          {result.aiDetection.indicators && result.aiDetection.indicators.length > 0 && (
                            <ul style={{ marginTop: 'var(--spacing-xs)', marginLeft: 'var(--spacing-xl)', fontSize: '12px' }}>
                              {result.aiDetection.indicators.slice(0, 3).map((indicator, idx) => (
                                <li key={idx} style={{ marginBottom: '2px' }}>{indicator}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {result.securityWarnings && result.securityWarnings.length > 0 && (
                        <div className="security-warnings" style={{
                          marginTop: 'var(--spacing-lg)',
                          padding: 'var(--spacing-md)',
                          background: 'var(--color-warning-light)',
                          border: '1px solid var(--color-warning)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-warning-dark)'
                        }}>
                          <strong>Security Warnings:</strong>
                          <ul style={{ marginTop: 'var(--spacing-sm)', marginLeft: 'var(--spacing-xl)' }}>
                            {result.securityWarnings.map((warning, idx) => (
                              <li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="result-details">
                <p><strong>Hash:</strong> <code>{result.hash?.slice(0, 16)}...{result.hash?.slice(-8)}</code></p>
                {result.attestationId && (
                  <p><strong>Attestation ID:</strong> <code>{result.attestationId.slice(0, 16)}...{result.attestationId.slice(-8)}</code></p>
                )}
                {result.txDigest && (
                  <p>
                    <strong>Transaction:</strong>{' '}
                    <a 
                      href={`https://suiexplorer.com/txblock/${result.txDigest}?network=${config?.network || 'testnet'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      {result.txDigest.slice(0, 16)}...{result.txDigest.slice(-8)}
                    </a>
                  </p>
                )}
                {result.creator && (
                  <p><strong>Creator:</strong> <code>{result.creator.slice(0, 10)}...{result.creator.slice(-6)}</code></p>
                )}
                {result.walrus_blob_id && (
                  <p><strong>Walrus Blob:</strong> <code>{result.walrus_blob_id.slice(0, 20)}...</code></p>
                )}
                {result.sealEncryption && (
                  <div style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    background: 'rgba(14, 165, 233, 0.1)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)'
                  }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔐 Seal Encryption Active
                    </strong>
                    <p style={{ marginTop: 'var(--spacing-xs)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      Sensitive metadata encrypted with identity-based encryption
                    </p>
                    <p style={{ marginTop: 'var(--spacing-xs)', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      Identity: <code>{result.sealEncryption.identity?.slice(0, 10)}...{result.sealEncryption.identity?.slice(-6)}</code>
                    </p>
                    <p style={{ marginTop: 'var(--spacing-xs)', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      Encrypted object: {result.sealEncryption.encryptedObject?.length || 0} chars • Session key: {result.sealEncryption.sessionKey?.length || 0} chars
                    </p>
                  </div>
                )}
                {result.sealProof && (
                  <p style={{ marginTop: 'var(--spacing-sm)', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    <strong>Seal Proof:</strong> {result.sealProof.algorithm || 'hash-based'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default RegisterSection


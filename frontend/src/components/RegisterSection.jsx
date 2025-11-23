import React, { useState, useEffect } from 'react'
import { useCurrentWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { registerMediaWithWallet } from '../utils/walletRegistration'
import { API_BASE } from '../config/api'
import './RegisterSection.css'
import './Button.css'

function RegisterSection() {
  const { isConnected, address } = useCurrentWallet()
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
      return blob
    }
    
    try {
      // Create image from blob
      const imageUrl = URL.createObjectURL(blob)
      const img = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = imageUrl
      })
      
      // Create canvas and draw image (this strips metadata)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      
      // Convert back to blob (normalized, no metadata)
      const normalizedBlob = await new Promise((resolve) => {
        canvas.toBlob((normalized) => {
          URL.revokeObjectURL(imageUrl)
          resolve(normalized || blob) // Fallback to original if conversion fails
        }, blob.type || 'image/png', 1.0) // Use original type, max quality
      })
      
      return normalizedBlob || blob // Fallback to original if normalization fails
    } catch (error) {
      console.warn('Failed to normalize image, using original:', error)
      return blob // Fallback to original blob if normalization fails
    }
  }

  const calculateHash = async (blob) => {
    // Normalize image first to strip metadata and ensure consistent hashing
    const normalizedBlob = await normalizeImage(blob)
    const arrayBuffer = await normalizedBlob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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
          // First, upload to Walrus via backend (we still need this for storage)
          const walrusResponse = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hash,
              source: metadata.source || 'Web Interface',
              mediaType: metadata.mediaType,
              isAiGenerated: metadata.isAiGenerated,
              metadata: fileMetadata,
              skipBlockchain: true, // Tell backend to skip blockchain, we'll do it with wallet
              creator: address || undefined, // Include creator address for reputation check
              imageMetadata: imageMetadata || undefined // Include image metadata for similarity detection
            })
          })

          if (!walrusResponse.ok) {
            const errorData = await walrusResponse.json()
            throw new Error(errorData.error || 'Walrus upload failed')
          }

          const walrusData = await walrusResponse.json()

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
                    method: 'wallet'
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
                const response = await fetch(`${API_BASE}/register`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    hash,
                    source: metadata.source || 'Web Interface',
                    mediaType: metadata.mediaType,
                    isAiGenerated: metadata.isAiGenerated,
                    metadata: fileMetadata,
                    creator: address || undefined, // Include creator address for reputation check
                    imageMetadata: imageMetadata || undefined // Include image metadata for similarity detection
                  })
                })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Registration failed')
        }

                const data = await response.json()
                
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
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default RegisterSection


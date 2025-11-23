import React, { useState } from 'react'
import { API_BASE } from '../config/api'
import './VerifySection.css'
import './Button.css'

function VerifySection() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

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
        const timeout = setTimeout(() => {
          reject(new Error('Image load timeout'))
        }, 30000) // 30 second timeout for large images
        image.onload = () => {
          clearTimeout(timeout)
          resolve(image)
        }
        image.onerror = (error) => {
          clearTimeout(timeout)
          console.warn('Image load error:', error, 'Type:', blob.type)
          reject(new Error(`Failed to load image: ${blob.type}`))
        }
        image.src = imageUrl
      })
      
      // Create canvas and draw image (this strips metadata)
      // Use natural dimensions for accurate size (not CSS-scaled dimensions)
      const canvas = document.createElement('canvas')
      const naturalWidth = img.naturalWidth || img.width
      const naturalHeight = img.naturalHeight || img.height
      
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
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Convert back to blob (normalized, no metadata)
      // Always use PNG format for consistency - this ensures the same image always produces the same hash
      // regardless of original format (JPEG, WebP, etc.)
      const normalizedBlob = await new Promise((resolve) => {
        canvas.toBlob((normalized) => {
          URL.revokeObjectURL(imageUrl)
          if (!normalized) {
            console.warn('Canvas toBlob returned null, using original blob')
            resolve(blob)
            return
          }
          // Ensure the blob has the correct type
          const typedBlob = new Blob([normalized], { type: 'image/png' })
          console.log('Image normalized successfully. Original dimensions:', img.naturalWidth, 'x', img.naturalHeight, 'Normalized dimensions:', canvas.width, 'x', canvas.height, {
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

  // Calculate hash without normalization (for fallback verification)
  const calculateHashWithoutNormalization = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Calculate hash (normalized)
      const hash = await calculateHash(file)
      
      // Verify with backend using normalized hash
      let response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hash })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Verification failed')
      }

      let data = await response.json()
      
      // If verification fails with normalized hash, try non-normalized hash as fallback
      // This handles images registered before normalization was added
      if (data.status !== 'verified' && file.type.startsWith('image/')) {
        console.log('Normalized hash not found, trying non-normalized hash as fallback...')
        const nonNormalizedHash = await calculateHashWithoutNormalization(file)
        console.log('Non-normalized hash:', nonNormalizedHash)
        if (nonNormalizedHash !== hash) {
          const fallbackResponse = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hash: nonNormalizedHash })
          })
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            if (fallbackData.status === 'verified') {
              console.log('Found match with non-normalized hash (image registered before normalization)')
              data = fallbackData
            }
          }
        }
      }
      
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to verify media')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="verify" className="verify-section">
      <div className="verify-container">
        <h2 className="section-title">Verify Media</h2>
        <p className="section-description">
          Upload an image or video to check if it's been registered on Sui blockchain. 
          Perfect for verifying media from social media platforms like Twitter, Instagram, and TikTok.
        </p>

        <div className="verify-content">
          <div className="verify-form-container">
            <form onSubmit={handleVerify} className="verify-form">
              <div className="form-group">
                <label htmlFor="verify-file" className="form-label">
                  Select Media File to Verify
                </label>
                <input
                  type="file"
                  id="verify-file"
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

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !file}
              >
                {loading ? 'Verifying...' : 'Verify on Sui Blockchain'}
              </button>
            </form>
          </div>

          {error && (
            <div className="result-card error">
              <h3>Verification Failed</h3>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className={`result-card ${result.status === 'verified' ? 'success' : 'warning'}`}>
              <h3>
                {result.status === 'verified' ? 'Verified on Sui' : 'Not Registered'}
              </h3>
              {result.status === 'verified' ? (
                <div className="result-details">
                  <p><strong>Hash:</strong> <code>{result.hash?.slice(0, 16)}...{result.hash?.slice(-8)}</code></p>
                  {result.attestationId && (
                    <p><strong>Attestation ID:</strong> <code>{result.attestationId.slice(0, 16)}...{result.attestationId.slice(-8)}</code></p>
                  )}
                  {result.creator && (
                    <p><strong>Creator:</strong> <code>{result.creator.slice(0, 16)}...{result.creator.slice(-8)}</code></p>
                  )}
                  {result.source && (
                    <p><strong>Source:</strong> {result.source}</p>
                  )}
                  {result.walrus_blob_id && (
                    <p><strong>Walrus Blob:</strong> <code>{result.walrus_blob_id.slice(0, 20)}...</code></p>
                  )}
                </div>
              ) : (
                <div className="result-details">
                  <p>This media has not been registered on TruthChain.</p>
                  <p>Upload it in the Register section to create an attestation on Sui blockchain.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default VerifySection


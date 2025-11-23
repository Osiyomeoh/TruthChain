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
      // Calculate hash
      const hash = await calculateHash(file)
      
      // Verify with backend
      const response = await fetch(`${API_BASE}/verify`, {
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

      const data = await response.json()
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


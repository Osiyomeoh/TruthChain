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

  const calculateHash = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer()
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


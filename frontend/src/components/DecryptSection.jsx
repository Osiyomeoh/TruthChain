import React, { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { API_BASE } from '../config/api'
import './DecryptSection.css'
import './Button.css'

function DecryptSection() {
  const currentAccount = useCurrentAccount()
  const address = currentAccount?.address
  const [walrusBlobId, setWalrusBlobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [decrypting, setDecrypting] = useState(false)
  const [decryptedData, setDecryptedData] = useState(null)
  const [error, setError] = useState(null)
  const [encryptedMetadata, setEncryptedMetadata] = useState(null)

  const handleFetchEncrypted = async () => {
    if (!walrusBlobId.trim()) {
      setError('Please enter a Walrus blob ID')
      return
    }

    setLoading(true)
    setError(null)
    setDecryptedData(null)
    setEncryptedMetadata(null)

    try {
      console.log('🔓 Fetching encrypted metadata from Walrus...')
      const response = await fetch(`${API_BASE}/decrypt/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walrusBlobId: walrusBlobId.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch encrypted metadata')
      }

      const data = await response.json()
      
      if (!data.hasEncryption) {
        setError('No encrypted metadata found for this blob ID')
        return
      }

      setEncryptedMetadata(data.encryptedMetadata)
      console.log('✅ Encrypted metadata fetched:', {
        hasEncryptedObject: !!data.encryptedMetadata.encryptedObject,
        hasSessionKey: !!data.encryptedMetadata.sessionKey,
        identity: data.encryptedMetadata.identity
      })
    } catch (err) {
      console.error('Error fetching encrypted metadata:', err)
      setError(err.message || 'Failed to fetch encrypted metadata')
    } finally {
      setLoading(false)
    }
  }

  const handleDecrypt = async () => {
    if (!address) {
      setError('Please connect your wallet first')
      return
    }

    if (!encryptedMetadata) {
      setError('Please fetch encrypted metadata first')
      return
    }

    // Verify identity matches
    if (encryptedMetadata.identity.toLowerCase() !== address.toLowerCase()) {
      setError(`This data is encrypted for a different address. Expected: ${encryptedMetadata.identity}, Your address: ${address}`)
      return
    }

    setDecrypting(true)
    setError(null)
    setDecryptedData(null)

    try {
      console.log('🔓 Starting decryption process...')
      
      // Step 1: Prepare transaction bytes
      console.log('📝 Preparing decryption transaction...')
      const txResponse = await fetch(`${API_BASE}/decrypt/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identity: address })
      })

      if (!txResponse.ok) {
        const errorData = await txResponse.json()
        throw new Error(errorData.error || 'Failed to prepare decryption transaction')
      }

      const txData = await txResponse.json()
      console.log('✅ Transaction bytes prepared')

      // Step 2: Execute decryption on backend
      console.log('🔓 Decrypting data...')
      const decryptResponse = await fetch(`${API_BASE}/decrypt/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encryptedObject: encryptedMetadata.encryptedObject,
          sessionKey: encryptedMetadata.sessionKey,
          identity: address,
          transactionBytes: txData.transactionBytes,
        })
      })

      if (!decryptResponse.ok) {
        const errorData = await decryptResponse.json()
        throw new Error(errorData.error || 'Decryption failed')
      }

      const decryptData = await decryptResponse.json()
      
      // Parse decrypted data (backend sends base64, decode it)
      const decryptedBytes = Uint8Array.from(
        atob(decryptData.decryptedData), 
        c => c.charCodeAt(0)
      )
      const decryptedText = new TextDecoder().decode(decryptedBytes)
      
      let decrypted
      try {
        decrypted = JSON.parse(decryptedText)
      } catch (e) {
        // If not JSON, return as text
        decrypted = { raw: decryptedText }
      }

      setDecryptedData(decrypted)
      console.log('✅ Decryption successful!', decrypted)
    } catch (err) {
      console.error('Decryption error:', err)
      setError(err.message || 'Decryption failed')
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <section id="decrypt" className="decrypt-section">
      <div className="decrypt-container">
        <h2 className="section-title">View Encrypted Metadata</h2>
        <p className="section-description">
          Decrypt and view your encrypted sensitive metadata using your wallet.
          Only the creator (the address that encrypted the data) can decrypt it.
        </p>

        <div className="decrypt-content">
          <div className="decrypt-form-container">
            <div className="form-group">
              <label htmlFor="walrusBlobId" className="form-label">
                Walrus Blob ID
              </label>
              <input
                type="text"
                id="walrusBlobId"
                value={walrusBlobId}
                onChange={(e) => setWalrusBlobId(e.target.value)}
                className="form-input"
                placeholder="Enter the Walrus blob ID from registration"
                disabled={loading}
              />
              <p className="form-hint">
                You can find this in the registration result as "Walrus Blob"
              </p>
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={handleFetchEncrypted}
                className="btn btn-secondary"
                disabled={loading || !walrusBlobId.trim()}
              >
                {loading ? 'Fetching...' : 'Fetch Encrypted Metadata'}
              </button>

              {encryptedMetadata && (
                <button
                  type="button"
                  onClick={handleDecrypt}
                  className="btn btn-primary"
                  disabled={loading || decrypting || !address}
                >
                  {decrypting ? 'Decrypting...' : 'Decrypt with Wallet'}
                </button>
              )}
            </div>

            {!address && (
              <div className="wallet-warning">
                ⚠️ Please connect your wallet to decrypt metadata
              </div>
            )}

            {encryptedMetadata && (
              <div className="encrypted-info">
                <h3>Encrypted Metadata Found</h3>
                <p><strong>Identity:</strong> <code>{encryptedMetadata.identity}</code></p>
                <p><strong>Your Address:</strong> <code>{address || 'Not connected'}</code></p>
                {address && encryptedMetadata.identity.toLowerCase() === address.toLowerCase() ? (
                  <p className="match-success">✅ Address matches - You can decrypt this data</p>
                ) : (
                  <p className="match-error">❌ Address does not match - You cannot decrypt this data</p>
                )}
              </div>
            )}

            {error && (
              <div className="result-card error">
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            )}

            {decryptedData && (
              <div className="result-card success">
                <h3>Decrypted Metadata</h3>
                <div className="decrypted-content">
                  <pre>{JSON.stringify(decryptedData, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default DecryptSection


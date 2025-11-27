import React from 'react'
import './Terms.css'
import './Button.css'

function Terms() {
  return (
    <div className="terms-page">
      <div className="terms-container">
        <div className="terms-header">
          <h1>Terms and Conditions</h1>
          <p className="terms-last-updated">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="terms-content">
          <section className="terms-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using TruthChain ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Description of Service</h2>
            <p>
              TruthChain is a blockchain-based media verification platform that allows users to:
            </p>
            <ul>
              <li>Register media (images, videos, documents) on the Sui blockchain</li>
              <li>Verify the authenticity of media through blockchain attestations</li>
              <li>Access verification services through our web interface and browser extension</li>
            </ul>
            <p>
              The Service utilizes Sui blockchain and Walrus storage technologies to provide 
              decentralized, immutable media verification.
            </p>
          </section>

          <section className="terms-section">
            <h2>3. Non-Commercial Use Only</h2>
            <p>
              <strong>IMPORTANT: TruthChain is provided for NON-COMMERCIAL USE ONLY.</strong>
            </p>
            <p>You agree that you will NOT use TruthChain for any commercial purposes, including but not limited to:</p>
            <ul>
              <li>Selling the Service or any derivative works</li>
              <li>Using the Service in a commercial product or service</li>
              <li>Using the Service for profit-generating activities</li>
              <li>Incorporating the Service into a commercial offering</li>
              <li>Using the Service to provide services for which you charge fees</li>
            </ul>
            <p>
              <strong>Permitted Uses:</strong> Personal, educational, research, hackathon, and academic use are permitted under this non-commercial license.
            </p>
            <p>
              <strong>Commercial Licensing:</strong> For commercial use, you must obtain a separate commercial license from the copyright holders. Please contact the project maintainers for commercial licensing inquiries.
            </p>
          </section>

          <section className="terms-section">
            <h2>4. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
              <li>Provide accurate information when registering media</li>
              <li>Only register media that you own or have the right to register</li>
              <li>Not use the Service for any illegal or unauthorized purpose</li>
              <li>Not attempt to register altered, manipulated, or fraudulent media</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Maintain the security of your wallet credentials if using wallet-based registration</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>5. Blockchain Transactions</h2>
            <p>
              When you register media using wallet-based registration, you are responsible for:
            </p>
            <ul>
              <li>Paying all gas fees associated with blockchain transactions</li>
              <li>Ensuring you have sufficient SUI tokens in your wallet</li>
              <li>Understanding that blockchain transactions are irreversible</li>
              <li>Managing your private keys and wallet security</li>
            </ul>
            <p>
              TruthChain is not responsible for any loss of funds, tokens, or data resulting from user error, 
              wallet compromise, or blockchain network issues.
            </p>
          </section>

          <section className="terms-section">
            <h2>6. AI-Generated Content</h2>
            <p>
              TruthChain includes automatic detection of AI-generated content. This detection is provided for informational purposes only 
              and should not be considered definitive proof. You are responsible for accurately marking content as AI-generated when registering media.
            </p>
            <p>
              Misrepresenting AI-generated content as human-created may result in your content being flagged or your account being restricted.
            </p>
          </section>

          <section className="terms-section">
            <h2>7. Intellectual Property</h2>
            <p>
              You retain all ownership rights to the media you register. By registering media on TruthChain, you grant us a limited, 
              non-exclusive license to:
            </p>
            <ul>
              <li>Store metadata and attestations on the blockchain</li>
              <li>Display verification information through our Service</li>
              <li>Use anonymized data for service improvement and analytics</li>
            </ul>
            <p>
              You represent and warrant that you own or have the necessary rights to register the media you submit.
            </p>
          </section>

          <section className="terms-section">
            <h2>8. Privacy and Data</h2>
            <p>
              TruthChain processes media hashes and metadata to provide verification services. We do not store the actual media files 
              on our servers. Media metadata is stored on decentralized storage (Walrus) and attestations are recorded on the Sui blockchain.
            </p>
            <p>
              By using the Service, you acknowledge that blockchain transactions are public and permanent. 
              Attestation data, including creator addresses and timestamps, will be visible on the blockchain.
            </p>
          </section>

          <section className="terms-section">
            <h2>9. Service Availability</h2>
            <p>
              TruthChain is provided "as is" and "as available." We do not guarantee:
            </p>
            <ul>
              <li>Uninterrupted or error-free service</li>
              <li>Immediate processing of all verification requests</li>
              <li>Compatibility with all browsers or devices</li>
              <li>Availability of blockchain network services</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TruthChain and its operators shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, 
              or any loss of data, use, goodwill, or other intangible losses resulting from:
            </p>
            <ul>
              <li>Your use or inability to use the Service</li>
              <li>Any unauthorized access to or use of our servers or data</li>
              <li>Any errors or omissions in the Service</li>
              <li>Blockchain network failures or issues</li>
              <li>Loss of funds or tokens due to user error or wallet compromise</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>11. Prohibited Uses</h2>
            <p>You may not use the Service to:</p>
            <ul>
              <li>Register media that infringes on intellectual property rights</li>
              <li>Register illegal, harmful, or offensive content</li>
              <li>Impersonate others or provide false information</li>
              <li>Attempt to manipulate or game the verification system</li>
              <li>Interfere with or disrupt the Service or blockchain networks</li>
              <li>Use automated systems to abuse the Service</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>12. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms and Conditions at any time. We will notify users of material changes 
              by updating the "Last Updated" date at the top of this page. Your continued use of the Service after such modifications 
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="terms-section">
            <h2>13. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause or notice, 
              for any reason, including if you breach these Terms and Conditions.
            </p>
            <p>
              Note that blockchain attestations are permanent and cannot be deleted, even if your access to the Service is terminated.
            </p>
          </section>

          <section className="terms-section">
            <h2>14. Governing Law</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with applicable laws, without regard to 
              conflict of law provisions. Any disputes arising from these terms or your use of the Service shall be resolved through 
              appropriate legal channels.
            </p>
          </section>

          <section className="terms-section">
            <h2>15. Contact Information</h2>
            <p>
              If you have any questions about these Terms and Conditions, please contact us through:
            </p>
            <ul>
              <li>GitHub: <a href="https://github.com/Osiyomeoh/TruthChain" target="_blank" rel="noopener noreferrer">https://github.com/Osiyomeoh/TruthChain</a></li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>15. Acknowledgment</h2>
            <p>
              By using TruthChain, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please discontinue use of the Service immediately.
            </p>
          </section>
        </div>

        <div className="terms-footer">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.scrollTo(0, 0); }}>Back to Home</a>
        </div>
      </div>
    </div>
  )
}

export default Terms


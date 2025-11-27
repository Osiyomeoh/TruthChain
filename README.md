# TruthChain - Provably Authentic Media Verification

> **A decentralized media authenticity platform using Walrus and Sui blockchain**

[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-red.svg)](LICENSE)
[![Built for Walrus Haulout Hackathon](https://img.shields.io/badge/Hackathon-Walrus%20Haulout-blue)](https://haulout.devpost.com)

> ⚠️ **NON-COMMERCIAL USE ONLY**: This software is provided for **educational, research, and hackathon purposes only**. Commercial use is strictly prohibited without explicit written permission. See [LICENSE](LICENSE) for details.

## 🏆 Hackathon Track: Provably Authentic (Truth Engine + Trust Oracle)

TruthChain is a **decentralized media authenticity platform** that **instantly verifies the authenticity of any image or video** through:

**🌐 Web Platform**: Full-featured web application for media registration and verification  
**🔌 Browser Extension**: Seamless verification on any website as you browse

Both interfaces leverage:
- **🦭 Walrus**: Decentralized blob storage for media metadata
- **⛓️ Sui Blockchain**: Immutable on-chain attestation registry
- **🔍 Indexing Service**: Fast search and analytics for attestations

## 🎯 Problem Statement

In an era of AI-generated content and deepfakes, users can't trust what they see online. Traditional verification methods are centralized, expensive, and slow. TruthChain is a **complete platform** that provides **instant, decentralized, and provable authenticity verification** for any media through:

- **🌐 Web Application**: Full-featured interface for media registration and verification
- **🔌 Browser Extension**: Seamless verification while browsing any website

Both interfaces work together to provide comprehensive media authenticity verification across the entire web.

## ✨ Key Features

### 🌐 **Web Platform**
- **Media Registration**: Upload and register images/videos with detailed metadata
- **Media Verification**: Upload files to verify authenticity
- **Wallet Integration**: Connect Sui wallet for direct blockchain transactions
- **Seal Encryption**: Automatic encryption of sensitive metadata when wallet is connected
- **Encrypted Metadata Viewing**: Decrypt and view your encrypted sensitive metadata
- **Detailed Results**: View attestation details, creator info, timestamps, and transaction hashes
- **AI Detection**: Automatic detection of AI-generated content
- **Terms & Conditions**: Complete legal framework for platform usage

### 🔌 **Browser Extension**
- **Auto-Verification**: Automatically scans and verifies images/videos as you browse
- **Works Everywhere**: Functions on social media feeds, news sites, and any website
- **Non-Intrusive Badges**: Visual badges show verification status instantly
- **Hover Detection**: Badges appear when hovering over images/videos
- **Right-Click Menu**: Quick access to verify or register media
- **Sidebar Details**: Click badge to view detailed verification information

### 🖼️ **Multi-Format Support**
- Images (JPG, PNG, WebP, AVIF, etc.)
- Videos (MP4, WebM, etc.)
- Content-based hashing (not URL-based)
- Image normalization ensures consistent hashing across formats

### 🔐 **Decentralized Architecture**
- **Walrus**: Stores media metadata as blobs
- **Sui**: On-chain attestation registry for immutable verification
- **Indexing Service**: Fast search and analytics for attestations

### 🔍 **Advanced Search & Analytics**
- Search attestations by creator, source, date, media type
- Real-time verification statistics
- Top creators and sources tracking
- Analytics dashboard capabilities

### 🚀 **Zero-Friction UX**
- **Extension**: Right-click "Verify with TruthChain" on any media
- **Extension**: Automatic background verification with hover badges
- **Frontend**: Simple file upload interface
- **Both**: Visual feedback with verification status
- **Extension**: Works in fullscreen and responsive to scroll

## 🏗️ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Web Frontend      │     │ Browser Extension   │
│   (React + Vite)    │     │ (Manifest V3)       │
│   - Registration    │     │ - Auto-Verification │
│   - Verification    │     │ - Hover Badges      │
│   - Wallet Connect  │     │ - Right-Click Menu  │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └───────────┬───────────────┘
                       │
                       ▼
            ┌───────────────────┐
            │   Backend API     │
            │   (Express + TS)  │
            │   - Validation    │
            │   - Processing    │
            └──────────┬────────┘
                       │
              ┌────────┴────────┐
              │                │
              ▼                ▼
      ┌─────────────┐  ┌──────────────┐
      │   Walrus    │  │     Sui      │
      │  (Blob      │  │  (On-chain   │
      │  Storage)   │  │  Registry)   │
      └──────┬──────┘  └──────┬───────┘
             │                │
             ▼                ▼
      ┌──────────────┐
      │   Indexing  │
      │   Service   │
      │  (Search &  │
      │  Analytics) │
      └──────────────┘
```

### Technology Stack

**Web Frontend:**
- React + Vite for fast development
- @mysten/dapp-kit for Sui wallet integration
- Component-based architecture
- File upload and verification interface

**Browser Extension:**
- Chrome Extension (Manifest V3)
- Content Scripts for media detection
- Background Service Worker for API communication
- Hover-based badge system

**Backend:**
- Node.js + Express
- TypeScript
- Walrus SDK integration
- Seal SDK for identity-based encryption (optional)
- Custom indexing service for search and analytics
- Sui SDK for blockchain interactions

**Smart Contracts:**
- Sui Move contracts
- Attestation registry on-chain
- Event-based verification tracking

## 🔧 How Technologies Work in TruthChain

### 1. **Sui Blockchain** ⛓️

**What it does:**
- Stores immutable attestation records on-chain
- Provides fast, low-cost transactions
- Enables decentralized verification without central authority

**How it's used:**
- **Smart Contract** (`truthchain_attestation.move`): Defines `MediaAttestation` struct and `AttestationRegistry` for hash-to-attestation mapping
- **On-chain Storage**: Each media hash maps to an attestation object containing creator, timestamp, source, and Walrus blob ID
- **Events**: Emits `AttestationCreated` and `AttestationVerified` events for indexing
- **Dynamic Fields**: Uses Sui's `Table` type for efficient hash lookups
- **SDK Integration**: `@mysten/sui.js` handles transaction creation, signing, and queries

**Implementation:**
- Registration: Creates `MediaAttestation` object and stores in registry
- Verification: Queries registry by hash to find attestation
- Events: Track all registration and verification activities

---

### 2. **Walrus** 🦭

**What it does:**
- Decentralized blob storage on Sui network
- Stores media metadata and cryptographic proofs
- Provides redundancy through RS2 encoding

**How it's used:**
- **Blob Storage**: Stores JSON containing media hash and metadata (source, creator, timestamps)
- **Publisher API**: Uploads blobs via `PUT /v1/blobs?epochs=5` endpoint
- **Aggregator API**: Retrieves blobs by blob ID
- **Blob ID**: Returns unique identifier (e.g., `FY-72_RfZby6TkHIitCf4EBWkqepsZn4Io_HHvDrfhg`) stored on-chain

**Implementation:**
- Registration: Uploads metadata as blob, stores blob ID on-chain
- Verification: Retrieves blob from aggregator using blob ID from attestation
- Data Structure: `{ hash, metadata }` where metadata includes source, creator, and timestamps

---

### 3. **Seal** 🔒 (Backend + Frontend - Optional)

**What it does:**
- Decentralized secrets management (DSM) for identity-based encryption
- Encrypts sensitive data before storing on Walrus
- Access controlled by on-chain policies on Sui
- Threshold secret sharing for enhanced security
- Enables creators to decrypt and view their encrypted metadata

**How it's used:**

**Backend:**
- **Encryption**: Encrypts sensitive metadata (source URLs, custom metadata) using creator's identity
- **Identity-Based**: Data encrypted for specific Sui addresses (creators)
- **Walrus Integration**: Encrypted data stored on Walrus alongside unencrypted hash
- **Access Control**: Decryption requires proper session keys and on-chain approval
- **Automatic**: Encrypts automatically when creator address is provided during registration
- **Optional**: Falls back to hash-based proofs if Seal is not configured or no creator address provided

**Frontend:**
- **Encryption Status**: Shows Seal encryption status in registration results
- **Encrypted Metadata Viewing**: Decrypt and view encrypted sensitive metadata
- **Identity Verification**: Only the creator (the address that encrypted the data) can decrypt
- **User Interface**: Dedicated "View Encrypted Metadata" section for decryption

**Implementation:**
- `backend/src/services/seal.ts` - Seal SDK integration for encryption/decryption
- `backend/src/controllers/attestation.ts` - Encryption during registration, decryption endpoints
- `frontend/src/components/DecryptSection.jsx` - Frontend UI for viewing encrypted metadata
- Uses `@mysten/seal` package for encryption/decryption
- Encrypts sensitive metadata during registration if `SEAL_ENABLED=true` and creator address provided
- Stores encrypted object and session key in Walrus metadata
- Backend endpoints: `/v1/decrypt/metadata`, `/v1/decrypt/prepare`, `/v1/decrypt/execute`
- Backward compatible with hash-based proofs

**Configuration:**
- `SEAL_ENABLED` - Enable/disable Seal encryption
- `SEAL_PACKAGE_ID` - Seal smart contract package ID (Testnet: `0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682`)
- `SEAL_KEY_SERVERS` - Key server configurations (format: `objectId:weight:apiKeyName:apiKey`)
- `SEAL_THRESHOLD` - Threshold for secret sharing (requires at least this many key servers)

**Key Servers:**
- Seal relies on a committee of key servers to generate threshold-based decryption keys
- **Testnet Package ID**: `0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682`
- **Mainnet Package ID**: `0xa212c4c6c7183b911d0be8768f4cb1df7a383025b5d0ba0c014009f0f30f5f8d`
- Use verified key servers for Testnet (see Seal documentation)
- For permissioned servers, contact the provider to allowlist your access policy package ID
- Key servers can operate in **Open mode** (any package) or **Permissioned mode** (allowlisted packages)
- Each key server must be registered on-chain using `seal::key_server::create_and_transfer_v1`
- Key server object ID is required in `SEAL_KEY_SERVERS` configuration
- See [Seal Key Server Operations](https://seal-docs.wal.app/key-server-operations/) for details

**Note:** Seal is optional. If not configured, TruthChain uses hash-based integrity proofs.

---

### 4. **Indexing Service** 🔍

**What it does:**
- Fast indexing and querying for attestation data
- Enables search by creator, source, date, media type
- Provides analytics and statistics

**How it's used:**
- **Event Indexing**: Indexes `AttestationCreated` events from Sui blockchain
- **Multi-dimensional Indexes**: Creates indexes by creator, source, timestamp, media type
- **Search API**: Enables queries like "all attestations by creator X" or "photos from source Y"
- **Statistics**: Tracks total attestations, verifications, top creators, top sources

**Implementation:**
- `IndexingService` class in `backend/src/services/indexing.ts` (custom indexing service)
- In-memory indexes for fast queries
- `indexAttestation()`: Adds attestation to all relevant indexes
- `search()`: Queries indexes with filters
- `getStats()`: Returns verification statistics

---

### 6. **React + Vite** ⚛️ (Frontend Only)

**What it does:**
- React provides component-based UI framework
- Vite provides fast development server and optimized builds

**How it's used in Frontend:**
- **Component Architecture**: Modular components (RegisterSection, VerifySection, WalletButton, etc.)
- **State Management**: React hooks (`useState`, `useEffect`) for component state
- **Fast Development**: Vite's HMR (Hot Module Replacement) for instant updates
- **Optimized Builds**: Vite bundles and optimizes for production
- **User Interface**: Provides web-based interface for media registration and verification

**Implementation:**
- `frontend/src/components/` - All React components
- `frontend/src/main.jsx` - React app entry point
- `frontend/vite.config.js` - Vite configuration
- React Query for API data fetching and caching

**Note:** Extension uses vanilla JavaScript, not React

---

### 7. **@mysten/dapp-kit** 🔐 (Frontend Only)

**What it does:**
- Sui wallet integration library for React
- Handles wallet connection, transaction signing, and wallet state

**How it's used in Frontend:**
- **Wallet Connection**: Users connect Sui wallets (Sui Wallet, Ethos, etc.)
- **Transaction Signing**: Users sign blockchain transactions directly from frontend
- **Wallet-based Registration**: Alternative to backend-initiated transactions
- **Hooks**: `useCurrentWallet()`, `useSignAndExecuteTransaction()`, `useConnectWallet()`

**Implementation:**
- `frontend/src/components/WalletButton.jsx` - Wallet connection UI
- `frontend/src/components/WalletProvider.jsx` - Wallet context provider
- `frontend/src/utils/walletRegistration.js` - Transaction building for wallet signing
- Enables user-controlled, non-custodial registrations

**Note:** Extension uses backend API for all operations, not direct wallet integration

---

### 8. **Node.js + Express + TypeScript** 🚀

**What it does:**
- Node.js provides JavaScript runtime for backend
- Express provides web framework for REST API
- TypeScript provides type safety and better developer experience

**How it's used:**
- **REST API**: Express routes handle `/v1/register`, `/v1/verify`, `/v1/search`, etc.
- **Type Safety**: TypeScript ensures type correctness across backend code
- **Middleware**: CORS, JSON parsing, error handling
- **Environment Variables**: Configuration via `.env` file

**Implementation:**
- `backend/src/index.ts` - Express server setup
- `backend/src/routes.ts` - API route definitions
- `backend/src/controllers/attestation.ts` - Request handlers with Zod validation
- TypeScript compiles to JavaScript for production

---

### 9. **Zod** ✅

**What it does:**
- TypeScript-first schema validation library
- Validates and parses data at runtime

**How it's used:**
- **Request Validation**: Validates API request bodies before processing
- **Type Safety**: Ensures data matches expected schema
- **Error Messages**: Provides clear error messages for invalid inputs

**Implementation:**
- `RegisterSchema`: Validates hash (64 chars), source, mediaType, metadata
- `VerifySchema`: Validates hash format
- Used in `backend/src/controllers/attestation.ts` for all API endpoints

---

### 10. **Chrome Extension API** 🌐 (Extension Only)

**What it does:**
- Browser extension platform for Chrome/Edge
- Allows injection of scripts into web pages
- Provides APIs for storage, context menus, messaging

**How it's used in Extension:**
- **Content Scripts**: Injected into web pages to detect media elements
- **Background Service Worker**: Handles API calls and message passing
- **Context Menus**: Right-click menu for "Verify with TruthChain"
- **Storage API**: Caches verification results locally
- **Hover Detection**: Shows badges when user hovers over images/videos
- **Cross-site Access**: Works on any website with images/videos

**Implementation:**
- `browser-extension/manifest.json` - Extension configuration (Manifest V3)
- `browser-extension/src/content.js` - Content script (media detection, badge display)
- `browser-extension/src/background.js` - Service worker (API communication)
- Works on any website with images/videos

**Note:** Frontend is a web application, not a browser extension

---

### 11. **Canvas API** 🎨 (Extension + Frontend)

**What it does:**
- Browser API for image manipulation and rendering
- Allows programmatic image processing

**How it's used in Extension:**
- **Image Normalization**: Re-encodes images to strip metadata (EXIF, etc.)
- **Format Conversion**: Converts all images to PNG format for consistent hashing
- **Metadata Removal**: Ensures same image content always produces same hash
- **Transparency Handling**: Fills transparent areas with white background
- **Consistent Hashing**: Same image produces same hash regardless of original format

**How it's used in Frontend:**
- **File Upload Processing**: Normalizes uploaded images before hashing
- **Format Standardization**: Converts all images to PNG for hash consistency
- **Metadata Stripping**: Removes EXIF and other metadata that could affect hash

**Implementation:**
- **Extension**: `normalizeImage()` function in `browser-extension/src/content.js`
- **Frontend**: Same `normalizeImage()` function in `frontend/src/components/RegisterSection.jsx` and `VerifySection.jsx`
- Process: Loads image → Draws to Canvas → Exports as PNG blob → Strips all metadata
- Ensures extension and frontend produce identical hashes for the same image

---

### 12. **SHA-256** 🔐 (Extension + Frontend + Backend)

**What it does:**
- Cryptographic hash function
- Generates unique 256-bit hash for any data

**How it's used in Extension:**
- **Media Hashing**: Generates unique hash for each image/video on web pages
- **Content-based Verification**: Hash based on image content, not URL
- **Verification Requests**: Sends hash to backend for verification
- **Registration Requests**: Sends hash to backend for registration

**How it's used in Frontend:**
- **File Hashing**: Generates hash for uploaded images/videos
- **Verification**: Sends hash to backend to check if media is registered
- **Registration**: Sends hash to backend to register new media

**How it's used in Backend:**
- **Hash Validation**: Validates hash format (64 characters)
- **Blockchain Queries**: Uses hash to query Sui blockchain for attestations

**Implementation:**
- **Extension**: `crypto.subtle.digest('SHA-256', arrayBuffer)` in `browser-extension/src/content.js`
- **Frontend**: Same API in `frontend/src/components/RegisterSection.jsx` and `VerifySection.jsx`
- **Backend**: `crypto.createHash('sha256')` in Node.js
- Used after image normalization to ensure consistent hashing
- 64-character hexadecimal string output
- Same image always produces same hash across extension, frontend, and backend

---

### 13. **Archiver** 📦

**What it does:**
- Node.js library for creating ZIP archives

**How it's used:**
- **Extension Packaging**: Packages browser extension files into ZIP
- **Download Endpoint**: Serves packaged extension via `/v1/extension/download`
- **User Installation**: Users download and install extension in Chrome

**Implementation:**
- `backend/src/services/extensionPackage.ts` - Creates ZIP from `browser-extension/` folder
- Served as downloadable file for easy extension installation

---

## 🔄 Technology Integration Flow

### Registration Process:

**Via Extension:**
1. User hovers over image → Extension detects media
2. Extension: Canvas API normalizes image → SHA-256 hash calculated
3. Extension: Sends hash + metadata to backend API
4. Backend: Zod validates request
5. Backend: Walrus stores metadata as blob → Returns blob ID
6. Backend: Sui SDK creates on-chain transaction → Stores attestation
7. Backend: Indexing service indexes attestation for search
8. Response: Returns attestation ID, transaction hash, blob ID to extension

**Via Frontend:**
1. User uploads file → Frontend processes file
2. Frontend: Canvas API normalizes image → SHA-256 hash calculated
3. Frontend: User selects registration method (Backend or Wallet)
4. If Backend: Sends hash + metadata to backend API (same as extension flow)
5. If Wallet: User connects wallet → Frontend builds transaction → User signs → Backend indexes
6. Backend: Zod validates → Walrus upload → Sui transaction → Indexing service
7. Response: Returns attestation ID, transaction hash, blob ID to frontend

### Verification Process:

**Via Extension:**
1. Extension: Detects media on page → Normalizes → Calculates hash
2. Extension: Sends hash to backend API
3. Backend: Sui SDK queries blockchain for attestation by hash
4. Backend: Retrieves blob from Walrus using blob ID
5. Backend: Updates indexing service verification count
6. Response: Returns verification status and attestation details to extension
7. Extension: Displays badge with verification status

**Via Frontend:**
1. User uploads file → Frontend processes file
2. Frontend: Canvas API normalizes image → SHA-256 hash calculated
3. Frontend: Sends hash to backend API
4. Backend: Sui SDK queries blockchain for attestation by hash
5. Backend: Retrieves blob from Walrus using blob ID
6. Backend: Updates indexing service verification count
7. Response: Returns verification status and attestation details to frontend
8. Frontend: Displays verification result with attestation details

### Key Differences:

**Extension:**
- Works on any website automatically
- Detects media on page load
- Shows badges on hover
- Uses backend API for all operations
- No wallet integration

**Frontend:**
- Web application interface
- User uploads files manually
- Supports wallet-based registration
- More detailed UI with metadata display
- Can connect Sui wallet for direct transactions

This architecture provides **decentralization** (Sui), **efficient storage** (Walrus), **fast queries** (Indexing Service), and **user-friendly interfaces** (React frontend + Chrome extension).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Chrome/Chromium browser
- Sui CLI (for contract deployment)
- Walrus access (testnet)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/truthchain.git
cd truthchain
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env  # If exists, or create .env
# Edit .env with:
# VITE_API_BASE_URL=https://truthchain-drow.onrender.com/v1
# VITE_SUI_NETWORK=testnet
npm run dev
# Frontend runs on http://localhost:5174
```

4. **Browser Extension Setup**
```bash
cd browser-extension
# Load unpacked extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the browser-extension folder
# OR download from: https://truthchain-drow.onrender.com/v1/extension/download
```

5. **Smart Contract Deployment** (Required for registration)
```bash
cd smart-contracts/truthchain_attestation
sui move build
sui client publish --gas-budget 100000000
```

### Environment Variables

**Backend** (`.env` in `backend/` directory):
```env
# Walrus Configuration
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Sui Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PACKAGE_ID=0x...  # From contract deployment
REGISTRY_OBJECT_ID=0x...  # From contract deployment
SUI_PRIVATE_KEY=suiprivkey1...  # For backend-initiated transactions

# Seal Configuration (Optional - for identity-based encryption)
# Seal enables encryption of sensitive metadata before storing on Walrus
# See https://seal-docs.wal.app/ for setup instructions
SEAL_ENABLED=false  # Set to 'true' to enable Seal encryption
SEAL_PACKAGE_ID=0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682  # Testnet Seal package ID
# SEAL_PACKAGE_ID=0xa212c4c6c7183b911d0be8768f4cb1df7a383025b5d0ba0c014009f0f30f5f8d  # Mainnet Seal package ID
SEAL_THRESHOLD=2  # Threshold for threshold secret sharing (default: 2, requires at least 2 key servers)
# Key Server Configuration Format: objectId:weight:apiKeyName:apiKey
# - objectId: The on-chain KeyServer object ID (from seal::key_server::create_and_transfer_v1)
#   To register a key server: sui client call --function create_and_transfer_v1 --module key_server 
#   --package <SEAL_PACKAGE_ID> --args <SERVER_NAME> https://<YOUR_URL> 0 <MASTER_PUBKEY>
# - weight: Server weight (typically 1)
# - apiKeyName: Optional API key header name (if key server requires authentication)
# - apiKey: Optional API key value
# Example: SEAL_KEY_SERVERS=0xabc123...:1:api_key:secret123,0xdef456...:1
# Note: Use verified key servers for Testnet. For permissioned servers, contact the provider
#       to allowlist your access policy package ID. See https://seal-docs.wal.app/ for details.
#       Key servers can run in Open mode (any package) or Permissioned mode (allowlisted packages).
SEAL_KEY_SERVERS=0x...:1:api_key_name:api_key_value
SEAL_VERIFY_KEY_SERVERS=true  # Verify key server authenticity (default: true)
SEAL_TIMEOUT=30000  # Timeout in milliseconds (default: 30000)

# Server
PORT=3000
```

**Frontend** (`.env` in `frontend/` directory):
```env
VITE_API_BASE_URL=https://truthchain-drow.onrender.com/v1
VITE_SUI_NETWORK=testnet
VITE_KEEP_ALIVE_INTERVAL=10
```

**Extension**: No environment file needed - API URL is hardcoded in `src/background.js`

### Seal Key Server Setup

For detailed instructions on setting up Seal key servers, see [SEAL_SETUP.md](backend/SEAL_SETUP.md).

**Quick options:**
1. **Use existing Testnet key servers** - Check Seal documentation or community for verified key servers
2. **Run your own key server** - See Seal documentation for key server operations
3. **Skip Seal** - TruthChain works perfectly without Seal (uses hash-based proofs by default)

## 📖 How It Works

### Image Normalization

All images are normalized before hashing to ensure consistent verification:
- Images are re-encoded through Canvas API
- Metadata (EXIF, etc.) is stripped
- All images converted to PNG format
- White background fill for transparency
- Same image content always produces same hash, regardless of original format

### Registration Flow

**Extension**:
1. User hovers over image → TruthChain badge appears
2. User clicks badge → Sidebar opens
3. User clicks "Register" → Extension fetches image
4. Image normalized → SHA-256 hash calculated
5. Hash + metadata sent to backend API
6. Backend processes (see Backend Flow below)
7. Sidebar shows success with transaction hash

**Frontend**:
1. User uploads file
2. File normalized → Hash calculated
3. User selects registration method (Backend or Wallet)
4. If Wallet: User connects Sui wallet and signs transaction
5. **Seal Encryption** (if wallet connected):
   - Creator address sent to backend
   - Backend encrypts sensitive metadata using Seal
   - Encryption status shown in registration result
6. Registration processed → Success message with details
7. **View Encrypted Metadata** (optional):
   - User can enter Walrus blob ID
   - Decrypt and view encrypted sensitive metadata

**Backend**:
1. Receives hash + metadata + creator address (if wallet connected)
2. AI detection analysis
3. Similarity check (prevents duplicates)
4. **Seal Encryption** (if enabled and creator address provided):
   - Encrypts sensitive metadata (source URL, custom metadata) using creator's identity
   - Stores encrypted object and session key in Walrus metadata
5. Upload to Walrus (metadata, including encrypted data if Seal was used)
6. Create Sui transaction (`register_media`)
7. Index in indexing service
8. Return attestation ID + transaction hash + Seal encryption status

### Verification Flow

**Extension**:
1. User hovers over image → Badge appears
2. Extension fetches image with Accept headers
3. Image normalized → Hash calculated
4. Hash sent to backend API
5. Backend queries Sui blockchain
6. If found: Badge shows "Verified ✓"
7. If not found: Badge shows "Unknown"
8. Click badge → Sidebar with details

**Frontend**:
1. User uploads file
2. File normalized → Hash calculated
3. Hash sent to backend API
4. Backend queries Sui blockchain
5. Result displayed with attestation details
6. Fallback: If normalized hash fails, tries non-normalized hash

**Backend**:
1. Receives hash
2. Query Sui blockchain for attestation
3. If found: Retrieve from Walrus
4. Update verification count in indexing service
5. Return attestation details

### Decryption Flow (View Encrypted Metadata)

**Frontend:**
1. User enters Walrus blob ID from registration result
2. Frontend fetches encrypted metadata from backend (`/v1/decrypt/metadata`)
3. Backend retrieves blob from Walrus and extracts encrypted data
4. Frontend verifies identity matches (only creator can decrypt)
5. User clicks "Decrypt with Wallet"
6. Backend prepares decryption transaction (`/v1/decrypt/prepare`)
7. Backend executes decryption (`/v1/decrypt/execute`)
8. Frontend displays decrypted sensitive metadata (source URL, custom metadata)

**Backend:**
1. Receives Walrus blob ID
2. Retrieves blob from Walrus aggregator
3. Extracts encrypted object and session key from metadata
4. Prepares transaction bytes for `seal_approve` function
5. Uses Seal SDK to decrypt data with session key and transaction bytes
6. Returns decrypted data (base64 encoded)

**Security:**
- Only the creator (the address that encrypted the data) can decrypt
- Requires proper session key and transaction bytes
- Identity verification prevents unauthorized decryption attempts

### Search & Analytics Flow

1. Query indexing service via `/v1/search`
2. Filter by creator, source, date, media type, AI status
3. Get real-time statistics via `/v1/stats`
4. Track verification trends and top creators
5. View creator reputation scores



## 🔌 API Endpoints

### Core Endpoints
- `POST /v1/register` - Register new media attestation (with optional Seal encryption)
- `POST /v1/verify` - Verify media hash

### Decryption Endpoints (Seal)
- `POST /v1/decrypt/metadata` - Fetch encrypted metadata from Walrus
  - Body: `{ walrusBlobId: string }`
  - Returns: Encrypted object, session key, and identity
- `POST /v1/decrypt/prepare` - Prepare decryption transaction bytes
  - Body: `{ identity: string }` (creator address)
  - Returns: Transaction bytes (base64) and package ID
- `POST /v1/decrypt/execute` - Execute decryption
  - Body: `{ encryptedObject: string, sessionKey: string, identity: string, transactionBytes: string }`
  - Returns: Decrypted data (base64 encoded)

### Search & Analytics Endpoints
- `GET /v1/search` - Search attestations with filters
  - Query params: `creator`, `source`, `dateFrom`, `dateTo`, `mediaType`, `isAiGenerated`
- `GET /v1/stats` - Get verification statistics
- `GET /v1/creator/:creator` - Get attestations by creator

### Example Usage

```bash
# Search by creator
curl "http://localhost:3000/v1/search?creator=0x..."

# Search by media type
curl "http://localhost:3000/v1/search?mediaType=photo"

# Get statistics
curl "http://localhost:3000/v1/stats"

# Get attestations by creator
curl "http://localhost:3000/v1/creator/0x..."
```

## 🔮 Future Enhancements

- [ ] Perceptual hashing for compressed/resized images
- [ ] Batch verification API
- [ ] Mobile app (iOS/Android)
- [ ] Browser extension for Firefox/Safari
- [ ] AI detection integration
- [ ] Reputation system for creators
- [ ] Multi-chain support
- [ ] Real-time analytics dashboard UI
- [ ] Advanced analytics visualizations

## 🤝 Contributing

This project was built for the Walrus Haulout Hackathon. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details


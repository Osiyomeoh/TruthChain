# TruthChain - Provably Authentic Media Verification

> **A decentralized media authenticity platform using Walrus, Seal, Nautilus, and Sui blockchain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built for Walrus Haulout Hackathon](https://img.shields.io/badge/Hackathon-Walrus%20Haulout-blue)](https://haulout.devpost.com)

## 🏆 Hackathon Track: Provably Authentic (Truth Engine + Trust Oracle)

TruthChain is a **decentralized media authenticity platform** that **instantly verifies the authenticity of any image or video** through:

**🌐 Web Platform**: Full-featured web application for media registration and verification  
**🔌 Browser Extension**: Seamless verification on any website as you browse

Both interfaces leverage:
- **🦭 Walrus**: Decentralized blob storage for media metadata and proofs
- **🔒 Seal**: Cryptographic integrity proofs for data verification
- **🔍 Nautilus**: Fast indexing and search for attestations
- **⛓️ Sui Blockchain**: Immutable on-chain attestation registry

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
- **Walrus**: Stores media metadata and Seal proofs as blobs
- **Seal**: Generates Merkle tree proofs for data integrity
- **Nautilus**: Indexes attestations for fast search and analytics
- **Sui**: On-chain attestation registry for immutable verification

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
      ┌─────────────┐  ┌──────────────┐
      │    Seal     │  │  Nautilus   │
      │  (Merkle    │  │  (Indexing  │
      │   Proofs)   │  │   & Search) │
      └─────────────┘  └──────────────┘
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
- Seal proof generation
- Nautilus indexing service
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
- **Blob Storage**: Stores JSON containing media hash, metadata (source, creator, timestamps), and Seal proof
- **Publisher API**: Uploads blobs via `PUT /v1/blobs?epochs=5` endpoint
- **Aggregator API**: Retrieves blobs by blob ID
- **Blob ID**: Returns unique identifier (e.g., `FY-72_RfZby6TkHIitCf4EBWkqepsZn4Io_HHvDrfhg`) stored on-chain

**Implementation:**
- Registration: Uploads metadata + Seal proof as blob, stores blob ID on-chain
- Verification: Retrieves blob from aggregator using blob ID from attestation
- Data Structure: `{ hash, metadata }` where metadata includes source, creator, timestamps, and Seal proof

---

### 3. **Seal** 🔒

**What it does:**
- Generates cryptographic integrity proofs using Merkle trees
- Detects any tampering or modification of data
- Provides lightweight proofs for verification

**How it's used:**
- **Merkle Tree Generation**: Chunks data into 1KB pieces, builds binary Merkle tree
- **Root Hash**: Serves as integrity proof - any data change changes the root
- **Proof Storage**: Merkle root stored with metadata in Walrus blob
- **Verification**: Rebuilds Merkle tree from data and compares root hash

**Implementation:**
- `SealVerifier` class in `backend/src/services/seal.ts`
- `generateProof()`: Creates Merkle tree from data chunks
- `verifyProof()`: Validates data integrity by comparing root hashes
- Used for both metadata integrity and media content verification

---

### 4. **Nautilus** 🔍

**What it does:**
- Fast indexing and querying infrastructure for Sui data
- Enables search by creator, source, date, media type
- Provides analytics and statistics

**How it's used:**
- **Event Indexing**: Indexes `AttestationCreated` events from Sui blockchain
- **Multi-dimensional Indexes**: Creates indexes by creator, source, timestamp, media type
- **Search API**: Enables queries like "all attestations by creator X" or "photos from source Y"
- **Statistics**: Tracks total attestations, verifications, top creators, top sources

**Implementation:**
- `NautilusIndexer` class in `backend/src/services/nautilus.ts`
- In-memory indexes (can be replaced with actual Nautilus API)
- `indexAttestation()`: Adds attestation to all relevant indexes
- `search()`: Queries indexes with filters
- `getStats()`: Returns verification statistics

---

### 5. **React + Vite** ⚛️ (Frontend Only)

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

### 6. **@mysten/dapp-kit** 🔐 (Frontend Only)

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

### 7. **Node.js + Express + TypeScript** 🚀

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

### 8. **Zod** ✅

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

### 9. **Chrome Extension API** 🌐 (Extension Only)

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

### 10. **Canvas API** 🎨 (Extension + Frontend)

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

### 11. **SHA-256** 🔐 (Extension + Frontend + Backend)

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
- **Seal Proofs**: Hash is included in Seal Merkle tree proofs

**Implementation:**
- **Extension**: `crypto.subtle.digest('SHA-256', arrayBuffer)` in `browser-extension/src/content.js`
- **Frontend**: Same API in `frontend/src/components/RegisterSection.jsx` and `VerifySection.jsx`
- **Backend**: `crypto.createHash('sha256')` in Node.js
- Used after image normalization to ensure consistent hashing
- 64-character hexadecimal string output
- Same image always produces same hash across extension, frontend, and backend

---

### 12. **Archiver** 📦

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
4. Backend: Zod validates request → Seal generates Merkle proof
5. Backend: Walrus stores metadata + proof as blob → Returns blob ID
6. Backend: Sui SDK creates on-chain transaction → Stores attestation
7. Backend: Nautilus indexes attestation for search
8. Response: Returns attestation ID, transaction hash, blob ID to extension

**Via Frontend:**
1. User uploads file → Frontend processes file
2. Frontend: Canvas API normalizes image → SHA-256 hash calculated
3. Frontend: User selects registration method (Backend or Wallet)
4. If Backend: Sends hash + metadata to backend API (same as extension flow)
5. If Wallet: User connects wallet → Frontend builds transaction → User signs → Backend indexes
6. Backend: Zod validates → Seal generates proof → Walrus upload → Sui transaction → Nautilus index
7. Response: Returns attestation ID, transaction hash, blob ID to frontend

### Verification Process:

**Via Extension:**
1. Extension: Detects media on page → Normalizes → Calculates hash
2. Extension: Sends hash to backend API
3. Backend: Sui SDK queries blockchain for attestation by hash
4. Backend: Retrieves blob from Walrus using blob ID
5. Backend: Verifies Seal proof integrity
6. Backend: Updates Nautilus verification count
7. Response: Returns verification status and attestation details to extension
8. Extension: Displays badge with verification status

**Via Frontend:**
1. User uploads file → Frontend processes file
2. Frontend: Canvas API normalizes image → SHA-256 hash calculated
3. Frontend: Sends hash to backend API
4. Backend: Sui SDK queries blockchain for attestation by hash
5. Backend: Retrieves blob from Walrus using blob ID
6. Backend: Verifies Seal proof integrity
7. Backend: Updates Nautilus verification count
8. Response: Returns verification status and attestation details to frontend
9. Frontend: Displays verification result with attestation details

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

This architecture provides **decentralization** (Sui), **data integrity** (Seal), **efficient storage** (Walrus), **fast queries** (Nautilus), and **user-friendly interfaces** (React frontend + Chrome extension).

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
5. Registration processed → Success message with details

**Backend**:
1. Receives hash + metadata
2. AI detection analysis
3. Similarity check (prevents duplicates)
4. Seal proof generation (Merkle tree)
5. Upload to Walrus (metadata + proof)
6. Create Sui transaction (`register_media`)
7. Index in Nautilus
8. Return attestation ID + transaction hash

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
4. Verify Seal proof
5. Update verification count in Nautilus
6. Return attestation details

### Search & Analytics Flow

1. Query **Nautilus** index via `/v1/search`
2. Filter by creator, source, date, media type, AI status
3. Get real-time statistics via `/v1/stats`
4. Track verification trends and top creators
5. View creator reputation scores

## 🎬 Demo

### Try It Out

**Via Web Platform:**
1. **Visit the web application** (see Frontend Setup above)
2. **Upload an image** in the Register section
3. **Connect your Sui wallet** (optional, for wallet-based registration)
4. **Register media** and view transaction details
5. **Verify media** by uploading files in the Verify section

**Via Browser Extension:**
1. **Install the extension** (see Installation above)
2. **Visit any website** with images (e.g., Unsplash, Twitter)
3. **Watch badges appear** automatically on verified media
4. **Hover over images** to see verification badges
5. **Right-click any image** → "Verify with TruthChain" or "Register with TruthChain"

### Demo Video Script

1. Show extension installed and working
2. Browse to a social media site
3. Demonstrate auto-verification badges appearing
4. Register a new image
5. Show on-chain transaction on Sui Explorer
6. Verify the same image on a different site
7. Show Walrus blob retrieval
8. **Demonstrate Nautilus search** - query attestations by creator/source
9. **Show analytics dashboard** - verification statistics

## 🏆 Hackathon Alignment

### Track: Provably Authentic (Truth Engine + Trust Oracle)

**✅ Authenticity on-chain**: Media hashes stored immutably on Sui blockchain

**✅ Verify provenance**: Complete chain from media → hash → Walrus → Seal → Nautilus → Sui

**✅ Trust Oracle**: Decentralized verification without central authority

**✅ Real-world impact**: Works on any website, instant verification

### Walrus Integration

- ✅ **Blob Storage**: Media metadata stored as blobs in Walrus
- ✅ **Decentralized**: No single point of failure
- ✅ **Retrievable**: Blobs can be fetched via aggregator API

### Seal Integration

- ✅ **Integrity Proofs**: Merkle tree proofs for data verification
- ✅ **Tamper Detection**: Any modification breaks the proof
- ✅ **Efficient**: Lightweight proofs stored with metadata

### Nautilus Integration

- ✅ **Fast Indexing**: Real-time indexing of attestation events
- ✅ **Advanced Search**: Query by creator, source, date, media type
- ✅ **Analytics**: Verification statistics and trends
- ✅ **Real-time Updates**: Index updates as new attestations are created

### Sui Integration

- ✅ **On-chain Registry**: Immutable attestation records
- ✅ **Event System**: Track verification events
- ✅ **Queryable**: Fast lookups via dynamic fields

## 📊 Project Metrics

- **Media Types Supported**: Images, Videos
- **Hash Algorithm**: SHA-256
- **Blockchain**: Sui (testnet)
- **Storage**: Walrus (decentralized blobs)
- **Indexing**: Nautilus (real-time search)
- **Verification Speed**: < 2 seconds
- **Auto-Verification**: First 20 media elements per page
- **Technologies**: Walrus ✅ Seal ✅ Nautilus ✅ Sui ✅

## 🔌 API Endpoints

### Core Endpoints
- `POST /v1/register` - Register new media attestation
- `POST /v1/verify` - Verify media hash

### Nautilus Search Endpoints
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
- [ ] Real-time Nautilus dashboard UI
- [ ] Advanced analytics visualizations

## 🤝 Contributing

This project was built for the Walrus Haulout Hackathon. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 👥 Team

Built with ❤️ for the Walrus Haulout Hackathon

## 📍 Contract Addresses & Deployment

### Smart Contracts (Sui Testnet)

**Package ID**: Set `PACKAGE_ID` in backend `.env` file  
**Registry Object ID**: Set `REGISTRY_OBJECT_ID` in backend `.env` file

To get these values after deployment:
1. Deploy the smart contract (see `smart-contracts/DEPLOY.md`)
2. Copy the `packageId` from deployment output
3. Copy the `registryObjectId` from the `AttestationRegistry` object
4. Add them to your backend `.env` file

### Deployment URLs

**Backend API (Production)**: `https://truthchain-drow.onrender.com`  
**Frontend (Production)**: Configure in `frontend/.env` with `VITE_API_BASE_URL`  
**Extension API**: Configured in `browser-extension/src/background.js`

### Network Configuration

- **Sui Network**: Testnet (`https://fullnode.testnet.sui.io:443`)
- **Walrus Publisher**: `https://publisher.walrus-testnet.walrus.space`
- **Walrus Aggregator**: `https://aggregator.walrus-testnet.walrus.space`

## 🔄 Complete Workflow

### Browser Extension Flow

#### Installation
1. Download extension ZIP from backend `/v1/extension/download` or clone repository
2. Extract and load in Chrome via `chrome://extensions/` (Developer mode)
3. Extension automatically connects to production API

#### Verification Flow (Extension)
1. **Media Detection**: Extension scans page for `<img>` and `<video>` elements
2. **Hover Detection**: When user hovers over media, extension shows TruthChain badge
3. **Hash Calculation**: 
   - Fetches image/video via `fetch()` with Accept headers
   - Normalizes image to PNG format (strips metadata)
   - Calculates SHA-256 hash of normalized content
4. **Verification Request**: Sends hash to backend via `POST /v1/verify`
5. **Result Display**: 
   - ✅ Verified: Green badge with checkmark
   - ❌ Unknown: Gray badge
   - ⚠️ Error: Red badge with retry option
6. **Sidebar**: Click badge to open sidebar with detailed verification info

#### Registration Flow (Extension)
1. **User Action**: Right-click media → "Register with TruthChain" or click badge → "Register"
2. **Hash Calculation**: Same normalization and hashing as verification
3. **Registration Request**: Sends hash + metadata to backend via `POST /v1/register`
4. **Backend Processing**:
   - Generates Seal proof (Merkle tree)
   - Uploads metadata + proof to Walrus
   - Creates on-chain attestation on Sui
   - Indexes in Nautilus
5. **Success Display**: Sidebar shows registration success with transaction hash
6. **Manual Verification**: User can click "Verify Registration" button to verify

### Frontend Flow

#### Setup
1. **Install Dependencies**: `cd frontend && npm install`
2. **Environment Variables**: Create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=https://truthchain-drow.onrender.com/v1
   VITE_SUI_NETWORK=testnet
   VITE_KEEP_ALIVE_INTERVAL=10
   ```
3. **Run Development**: `npm run dev` (runs on `http://localhost:5174`)

#### Registration Flow (Frontend)
1. **File Upload**: User selects image/video file
2. **Method Selection**: 
   - **Backend Method**: Backend handles blockchain transaction
   - **Wallet Method**: User's Sui wallet signs transaction (requires wallet connection)
3. **Hash Calculation**: 
   - Normalizes image to PNG (strips metadata)
   - Calculates SHA-256 hash
4. **Metadata Extraction**: Extracts width, height, format, size
5. **AI Detection**: Backend automatically detects AI-generated content
6. **Registration**:
   - **Backend Method**: 
     - Uploads to Walrus
     - Backend creates Sui transaction
     - Indexes in Nautilus
   - **Wallet Method**:
     - Uploads to Walrus
     - User signs transaction with Sui wallet
     - Indexes in Nautilus
7. **Success Display**: Shows transaction hash, Walrus blob ID, and verification link

#### Verification Flow (Frontend)
1. **File Upload**: User selects image/video file
2. **Hash Calculation**: Same normalization and hashing process
3. **Verification Request**: Sends hash to backend via `POST /v1/verify`
4. **Result Display**: 
   - ✅ Verified: Shows attestation details, creator, timestamp
   - ❌ Not Verified: Shows message to register media
5. **Fallback Verification**: If normalized hash fails, tries non-normalized hash (for images registered before normalization)

### Backend Flow

#### Registration Endpoint (`POST /v1/register`)
1. **Input Validation**: Validates hash (64 chars), source, mediaType
2. **Security Checks**:
   - AI Detection: Analyzes metadata for AI-generated content
   - Similarity Detection: Checks for similar images already registered
   - Reputation Check: Validates creator reputation
3. **Seal Proof Generation**: Creates Merkle tree proof for data integrity
4. **Walrus Upload**: Uploads metadata + Seal proof as blob
5. **Blockchain Transaction**: 
   - Creates Sui transaction with `register_media` function
   - Includes: hash, walrus_blob_id, source, media_type, is_ai_generated
   - Emits `AttestationCreated` event
6. **Nautilus Indexing**: Indexes attestation for fast search
7. **Response**: Returns attestation ID, transaction hash, Walrus blob ID

#### Verification Endpoint (`POST /v1/verify`)
1. **Hash Lookup**: Queries Sui blockchain for attestation by hash
2. **Attestation Retrieval**: Fetches attestation object from Sui
3. **Walrus Retrieval**: Fetches metadata + Seal proof from Walrus
4. **Proof Verification**: Verifies Seal proof integrity
5. **Update Count**: Increments verification count in Nautilus
6. **Response**: Returns verification status, attestation details, creator info

## 🔌 Complete API Reference

### Core Endpoints

**Base URL**: `https://truthchain-drow.onrender.com/v1` (Production) or `http://localhost:3000/v1` (Development)

#### `POST /v1/register`
Register new media attestation

**Request Body**:
```json
{
  "hash": "64-character-hex-string",
  "source": "example.com",
  "mediaType": "photo",
  "isAiGenerated": false,
  "metadata": "{\"width\": 1920, \"height\": 1080}",
  "skipBlockchain": false,
  "creator": "0x...",
  "imageMetadata": {
    "width": 1920,
    "height": 1080,
    "format": "image/jpeg",
    "size": 123456
  }
}
```

**Response**:
```json
{
  "success": true,
  "attestationId": "0x...",
  "transactionHash": "0x...",
  "walrusBlobId": "FY-72_RfZby6TkHIitCf4EBWkqepsZn4Io_HHvDrfhg",
  "verificationUrl": "https://verify.truthchain.io/{hash}",
  "aiDetection": {
    "isAiGenerated": false,
    "confidence": 15
  }
}
```

#### `POST /v1/verify`
Verify media hash

**Request Body**:
```json
{
  "hash": "64-character-hex-string"
}
```

**Response**:
```json
{
  "status": "verified",
  "attestation": {
    "id": "0x...",
    "creator": "0x...",
    "source": "example.com",
    "mediaType": "photo",
    "createdAt": 1234567890,
    "verificationCount": 42
  }
}
```

#### `GET /v1/config`
Get backend configuration (contract addresses, network)

**Response**:
```json
{
  "packageId": "0x...",
  "registryObjectId": "0x...",
  "suiRpcUrl": "https://fullnode.testnet.sui.io:443",
  "network": "testnet"
}
```

#### `GET /v1/proxy?url={encoded_url}`
Proxy endpoint for fetching media (bypasses CORS)

#### `GET /v1/extension/download`
Download packaged browser extension as ZIP

### Search & Analytics Endpoints

#### `GET /v1/search`
Search attestations with filters

**Query Parameters**:
- `creator`: Creator address
- `source`: Source domain
- `dateFrom`: Start date (ISO 8601)
- `dateTo`: End date (ISO 8601)
- `mediaType`: `photo`, `video`, `document`, `audio`
- `isAiGenerated`: `true` or `false`

#### `GET /v1/stats`
Get verification statistics

#### `GET /v1/creator/:creator`
Get all attestations by creator address

#### `GET /v1/reputation/:creator`
Get creator reputation score

#### `GET /v1/health`
Health check endpoint

## 🔗 Links

- **GitHub Repository**: `https://github.com/Osiyomeoh/TruthChain`
- **Backend API**: `https://truthchain-drow.onrender.com`
- **Sui Explorer**: View transactions at `https://suiexplorer.com/?network=testnet`
- **Extension Download**: `https://truthchain-drow.onrender.com/v1/extension/download`

---

**Built for Walrus Haulout Hackathon 2025** 🦭


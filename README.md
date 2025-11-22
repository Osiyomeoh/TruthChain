# TruthChain - Provably Authentic Media Verification

> **A decentralized media authenticity platform using Walrus, Seal, Nautilus, and Sui blockchain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built for Walrus Haulout Hackathon](https://img.shields.io/badge/Hackathon-Walrus%20Haulout-blue)](https://haulout.devpost.com)

## 🏆 Hackathon Track: Provably Authentic (Truth Engine + Trust Oracle)

TruthChain is a browser extension that **instantly verifies the authenticity of any image or video online** by leveraging:
- **🦭 Walrus**: Decentralized blob storage for media metadata and proofs
- **🔒 Seal**: Cryptographic integrity proofs for data verification
- **🔍 Nautilus**: Fast indexing and search for attestations
- **⛓️ Sui Blockchain**: Immutable on-chain attestation registry

## 🎯 Problem Statement

In an era of AI-generated content and deepfakes, users can't trust what they see online. Traditional verification methods are centralized, expensive, and slow. TruthChain provides **instant, decentralized, and provable authenticity verification** for any media on the web.

## ✨ Key Features

### 🔍 **Auto-Verification**
- Automatically scans and verifies images/videos as you browse
- Works on social media feeds, news sites, and any website
- Non-intrusive badges show verification status instantly

### 🖼️ **Multi-Format Support**
- Images (JPG, PNG, WebP, etc.)
- Videos (MP4, WebM, etc.)
- Content-based hashing (not URL-based)

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
- Right-click "Verify with TruthChain" on any media
- Automatic background verification
- Visual badges with verification status
- Works in fullscreen and responsive to scroll

## 🏗️ Architecture

```
┌─────────────────┐
│  Browser        │
│  Extension      │
│  (Content Hash) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  (Express)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Walrus │ │   Sui    │
│ (Blob) │ │(On-chain)│
└────────┘ └──────────┘
    │           │
    ▼           ▼
┌────────┐ ┌──────────┐
│  Seal  │ │ Nautilus │
│(Proofs)│ │ (Index)  │
└────────┘ └──────────┘
```

### Technology Stack

**Frontend:**
- Chrome Extension (Manifest V3)
- Content Scripts for media detection
- Background Service Worker for API communication

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

3. **Browser Extension Setup**
```bash
cd browser-extension
# Load unpacked extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the browser-extension folder
```

4. **Smart Contract Deployment** (Optional - for local testing)
```bash
cd smart-contracts/truthchain_attestation
sui move build
sui client publish --gas-budget 100000000
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Walrus Configuration
WALRUS_PUBLISHER_URL=https://publisher.walrus.testnet.sui.io
WALRUS_AGGREGATOR_URL=https://aggregator.walrus.testnet.sui.io

# Sui Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PACKAGE_ID=0x...
REGISTRY_OBJECT_ID=0x...
SUI_PRIVATE_KEY=suiprivkey1...

# Server
PORT=3000
```

## 📖 How It Works

### Registration Flow

1. User right-clicks an image/video → "Register with TruthChain"
2. Extension calculates SHA-256 hash of media content
3. Backend generates **Seal proof** (Merkle tree) for integrity
4. Metadata + Seal proof uploaded to **Walrus** as blob
5. On-chain attestation created on **Sui blockchain**
6. Attestation indexed in **Nautilus** for fast querying
7. Badge appears showing "Registered ✓"

### Verification Flow

1. Extension auto-scans page for media (or manual right-click)
2. Calculates hash of each image/video
3. Queries **Sui blockchain** for attestation
4. If found, retrieves Seal proof from **Walrus**
5. Verifies integrity using Seal proof
6. Updates verification count in **Nautilus** index
7. Badge shows "Verified ✓" or "Unknown"

### Search & Analytics Flow

1. Query **Nautilus** index for attestations
2. Filter by creator, source, date, media type
3. Get real-time statistics and analytics
4. Track verification trends and top creators

## 🎬 Demo

### Try It Out

1. **Install the extension** (see Installation above)
2. **Visit any website** with images (e.g., Unsplash, Twitter)
3. **Watch badges appear** automatically on verified media
4. **Right-click any image** → "Verify with TruthChain"
5. **Register new media** → Right-click → "Register with TruthChain"

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

## 🔗 Links

- **Demo**: [Link to demo video]
- **GitHub**: [Your repo URL]
- **Sui Explorer**: [Your contract address]
- **Walrus**: [Your blob examples]

---

**Built for Walrus Haulout Hackathon 2025** 🦭


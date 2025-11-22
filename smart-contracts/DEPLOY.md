# Deploying TruthChain Smart Contracts

The TruthChain smart contracts are **required** and must be deployed to Sui blockchain for the system to work.

## Prerequisites

1. Install Sui CLI:
```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

2. Set up Sui wallet:
```bash
sui client active-address
# If no address, create one:
sui client new-address ed25519
```

3. Get testnet SUI tokens:
- Visit https://discord.com/channels/916379725201563759/971488439931392130
- Use the faucet: `!faucet <your-address>`

## Deployment Steps

1. **Navigate to contract directory:**
```bash
cd smart-contracts/truthchain_attestation
```

2. **Build the contract:**
```bash
sui move build
```

3. **Deploy to Sui testnet:**
```bash
sui client publish --gas-budget 100000000 --json
```

4. **Save the output:**
The command will return:
- `packageId`: The package ID (starts with `0x`)
- `registryObjectId`: The AttestationRegistry object ID (starts with `0x`)

5. **Update backend .env file:**
Add these to your `backend/.env`:
```env
PACKAGE_ID=0x...  # From deployment output
REGISTRY_OBJECT_ID=0x...  # From deployment output
SUI_PRIVATE_KEY=suiprivkey1...  # Your private key
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet
```

## Contract Functions

### `register_media`
- Creates a new MediaAttestation object
- Stores hash, walrus blob ID, metadata
- Adds entry to AttestationRegistry
- Emits AttestationCreated event

### `verify_media`
- Increments verification count
- Emits AttestationVerified event

### Registry
- Global AttestationRegistry stores hash → attestation address mapping
- Enables fast lookups by hash

## Verification

After deployment, test the contract:
```bash
# Check registry object
sui client object <REGISTRY_OBJECT_ID>

# Query events
sui client events --package <PACKAGE_ID>
```

## Important Notes

- The contract is **required** for the backend to work
- Without PACKAGE_ID and REGISTRY_OBJECT_ID, registration will fail
- The registry is a shared object, so it's accessible by anyone
- Each attestation is also a shared object for public verification


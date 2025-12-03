# EncryptedDataMarket

A privacy-first encrypted data marketplace leveraging Zama (FHE) and Web3 technologies, allowing sensitive data to be processed fully encrypted while preserving privacy and usability. Users can submit encrypted data, and the system supports homomorphic aggregation, threshold alerts, anonymous voting, and zero-knowledge audit proofs.

## Project Background

Traditional data marketplaces often face challenges related to privacy, trust, and transparency:

• Sensitive data exposure: Users hesitate to share data if privacy is not guaranteed
• Centralized control: Administrators may access or manipulate data
• Lack of verifiable computation: Users cannot verify aggregation or voting results
• Limited insights: Aggregated statistics may be inaccurate or untrustworthy

EncryptedDataMarket solves these issues by providing:

• Full encryption: Data is encrypted client-side before submission
• Homomorphic aggregation: Compute statistics directly on encrypted data
• Anonymous voting: Users can submit encrypted votes with verifiable tallies
• Zero-knowledge proofs: Audits and correctness of processing are provable without revealing raw data
• Transparent, immutable smart contracts: All submissions and computations are recorded on-chain

## Features

### Core Functionality

• Encrypted Data Submission: Users submit numeric data in encrypted form
• Threshold Alerts: Homomorphically detect when data aggregates exceed limits
• Encrypted Aggregation: Compute sums and counts on ciphertexts
• Anonymous Voting: Submit encrypted votes and compute homomorphic tallies
• Audit Logs: Store zero-knowledge proofs verifying correct processing

### Privacy & Anonymity

• Client-side Encryption: Data encrypted before leaving user device
• Fully Anonymous: No identity or wallet information is required for submission
• Immutable Records: Submissions cannot be altered or deleted
• Encrypted Processing: Data remains protected throughout aggregation and voting

## Architecture

### Smart Contracts

EncryptedDataMarket.sol (Ethereum)

• Handles encrypted data submissions and encrypted votes
• Aggregates statistics homomorphically on-chain
• Stores zero-knowledge proofs for audits
• Provides public access to encrypted statistics without revealing raw values

### Frontend Application

• React + TypeScript: Interactive dashboard and submission interface
• Ethers.js: Interacts with Ethereum smart contracts
• Tailwind + CSS: Responsive layout and modern UI
• Real-time Updates: Fetch latest encrypted submissions and statistics
• Optional Wallet Integration: For authenticated deployments

## Technology Stack

### Blockchain

• Solidity ^0.8.24: Smart contract development
• FHE (Zama): Fully Homomorphic Encryption support
• Hardhat: Development, testing, deployment framework
• Ethereum Sepolia Testnet: Deployment network
• OpenZeppelin: Secure contract libraries

### Frontend

• React 18 + TypeScript: Modern frontend framework
• Ethers.js: Blockchain interaction
• Tailwind + CSS: Responsive design
• React Icons: UI iconography
• Vercel: Frontend deployment platform

## Installation

### Prerequisites

• Node.js 18+
• npm / yarn / pnpm package manager
• Ethereum wallet (optional, e.g., MetaMask)

### Setup

# Install dependencies

npm install

# Compile smart contracts

npx hardhat compile

# Deploy to network (configure hardhat.config.js first)

npx hardhat run deploy/deploy.ts --network sepolia

# Start frontend server

cd frontend
npm install
npm run dev

## Usage

• Submit Encrypted Data: Users can submit numeric data in encrypted form
• View Aggregated Statistics: Admins see encrypted sums, counts, and threshold alerts only
• Submit Encrypted Votes: Users participate anonymously
• Audit Verification: Verify zero-knowledge proofs for correctness

## Security Features

• End-to-End Encryption: Data encrypted before submission
• Homomorphic Computation: Aggregate statistics without decryption
• Anonymity by Design: No identity information stored
• Zero-Knowledge Audit Proofs: Verifiable correctness without revealing raw data
• Immutable On-Chain Records: Smart contract ensures data integrity

## Future Enhancements

• Multi-category encrypted aggregation with threshold alerts
• Multi-chain deployment for broader accessibility
• Mobile-friendly frontend interface
• DAO governance for community-driven improvements
• Advanced analytics on encrypted datasets using FHE

Built with ❤️ to enable secure, private, and trustworthy data processing on Ethereum.

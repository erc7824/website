---
title: Frequently Asked Questions
description: Common questions and answers about Nitrolite and state channels
keywords: [faq, questions, answers, help, support, state channels, nitrolite]
---

# Frequently Asked Questions

Common questions and answers about Nitrolite, state channels, and ERC-7824.

## Getting Started

### What is Nitrolite?

Nitrolite is a lightweight state channel framework that enables off-chain interactions between participants with on-chain security guarantees. It provides custody of ERC-20 tokens and native assets, mutual close capabilities, and challenge/response mechanisms for dispute resolution.

### How do state channels work?

State channels allow participants to conduct multiple transactions off-chain by:

1. **Opening:** Locking funds in a smart contract
2. **Transacting:** Exchanging signed state updates off-chain
3. **Closing:** Settling the final state on-chain

This reduces gas costs and enables instant transactions while maintaining security through cryptographic proofs and economic incentives.

### What's the difference between Nitrolite and other scaling solutions?

| Feature | Nitrolite | Optimistic Rollups | ZK Rollups | Sidechains |
|---------|-----------|-------------------|------------|------------|
| **Finality** | Instant | ~7 days | ~10 min | Variable |
| **Gas Costs** | Minimal | Reduced | Reduced | Low |
| **Security** | Ethereum-level | Ethereum-level | Ethereum-level | Sidechain-level |
| **Complexity** | Medium | Low | High | Low |
| **Use Cases** | P2P interactions | General purpose | General purpose | High throughput |

## Technical Questions

### What programming languages are supported?

**Client SDK:**
- **TypeScript/JavaScript:** Full-featured SDK built on Viem for browser and Node.js
- **Framework Agnostic:** Works with React, Vue, Angular, and other modern frameworks

**ClearNode Server:**
- **Go:** Complete server implementation with PostgreSQL/SQLite support
- **Multi-chain:** Supports Polygon, Celo, Base, Ethereum, and other EVM chains

**Smart Contracts:**
- **Solidity:** Core contracts implementing IChannel, IDeposit, and IAdjudicator interfaces

### What are the security guarantees?

**Cryptographic Security:**
- All state transitions require valid ECDSA signatures
- State integrity protected by cryptographic hashes
- Replay protection through nonces

**Economic Security:**
- Participants lock funds as commitment to honest behavior
- Challenge mechanisms provide recourse against disputes
- Penalty systems deter malicious actors

**Operational Security:**
- Two-party channels with Creator/Broker roles
- Challenge periods for dispute resolution
- On-chain adjudication through smart contracts

### How fast are transactions?

**Performance Metrics:**
- **State Updates:** < 50ms average latency
- **Throughput:** 1000+ transactions per second per channel
- **Network Propagation:** < 100ms globally
- **Dispute Resolution:** Varied (challenge period is defined by the application)

**Factors Affecting Speed:**
- Network connectivity and latency
- ClearNode performance and location
- WebSocket connection quality
- Database performance for ledger operations

## Development

### How do I get started?

See the [Quick Start Guide](./quick_start/) for installation and setup instructions.

### What types of applications can I build?

**Gaming Applications:**
- Turn-based games (chess, poker, strategy games)
- Real-time multiplayer games with state synchronization
- Betting and prediction markets
- Virtual asset trading

**Financial Applications:**
- Payment systems and micropayments
- Decentralized exchanges (order books)
- Lending and borrowing protocols
- Insurance and derivatives

**Communication & Social:**
- Messaging apps with payment integration
- Social media with content monetization
- Collaborative editing and version control
- Digital content marketplace

**Enterprise Solutions:**
- Supply chain tracking
- Multi-party business processes
- B2B payment networks
- IoT device coordination


### Can I integrate with existing smart contracts?

Yes! Nitrolite supports custom adjudicator contracts:

```solidity
contract MyGameApp is IAdjudicator {
    function adjudicate(
        Channel calldata chan,
        State calldata candidate,
        State[] calldata proofs
    ) external view override returns (bool valid) {
        // Implement your game-specific state validation
        return validateGameMove(candidate, proofs);
    }
}
```

**Integration Points:**
- **Custom Adjudicators:** Implement `IAdjudicator` interface for application logic
- **Asset Support:** ERC-20 tokens and native assets through Custody contract
- **Multi-Chain:** Deploy on any EVM-compatible blockchain

## Network and Infrastructure

### Do I need to run my own infrastructure?

**Options Available:**

**1. Self-Hosted (Recommended):**
- Run your own ClearNode instances using Go binary or Docker
- Full control over infrastructure and configuration
- Connect to your preferred blockchain RPC providers
- PostgreSQL or SQLite database options

**2. Public ClearNodes:**
- Connect to community-operated ClearNode instances
- Suitable for development and testing
- No guaranteed uptime or support

**3. Enterprise:**
- Deploy ClearNode clusters with load balancing
- Multi-region redundancy
- Custom monitoring and alerting

## Where can I get help?

**Documentation:**
- **[User Guides](./quick_start/):** Step-by-step tutorials
- **[API Reference](./nitrolite_client/):** Complete SDK documentation
- **[Troubleshooting](./troubleshooting):** Common issues and solutions

**Links:**
- **[GitHub](https://github.com/erc7824/nitro):** Technical discussions and issues
- **[Discord](https://discord.gg/yellownetwork):** Community & real-time chat support

---

## Still Have Questions?

Check [GitHub](https://github.com/erc7824/nitro) or join [Discord](https://discord.gg/yellownetwork) for support.

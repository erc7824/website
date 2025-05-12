---
sidebar_position: 1
title: React
description: Nitrolite React SDK Documentation
keywords: [erc7824, statechannels, state channels, nitrolite, ethereum scaling, layer 2, off-chain, react tutorial]
---

import { Card, CardGrid } from '@site/src/components/Card';

# Nitrolite React SDK

Welcome to the Nitrolite React SDK documentation! The Nitrolite SDK enables you to build scalable web3 applications using state channels, providing instant transactions and improved user experience.

<CardGrid cols={2}>
  <Card
    title="NitroliteClient"
    description="Main client for state channel interaction"
    to="./nitrolite_client"
  />
  <Card
    title="Nitrolite RPC"
    description="Real-time communication protocol"
    to="./nitrolite_rpc"
  />
  <Card
    title="Learning Path"
    description="Step-by-step guides to Nitrolite"
    to="./learn/getting_started"
  />
  <Card
    title="Examples"
    description="Sample applications and demos"
    to="./examples"
  />
</CardGrid>

## Getting Started

Nitrolite is a state channels implementation based on [ERC-7824](https://eips.ethereum.org/EIPS/eip-7824), enabling:

- **Instant transactions** - No waiting for confirmations
- **Minimal gas fees** - Only pay gas for opening and closing channels
- **High throughput** - Scales to thousands of transactions per second
- **Application flexibility** - Build games, payment systems, and more

To start using Nitrolite in your React application:

```bash
npm install @erc7824/nitrolite
```

## Core Components

The Nitrolite SDK consists of two main components:

1. **NitroliteClient** - The primary interface for interacting with state channels
2. **Nitrolite RPC** - The real-time communication protocol for state channel messaging

## Key Concepts

- **State Channels** - Off-chain payment channels established and settled on-chain
- **Channel Lifecycle** - Deposit, create, use, close, withdraw
- **Intent-based State** - Signed state transitions with allocation intents
- **Authentication** - Secure identity verification with signatures
- **Application Sessions** - Application-specific channel instances

---
sidebar_position: 1
title: Nitrolite SDK
description: Build scalable web3 applications with state channels using the Nitrolite SDK.
keywords: [erc7824, statechannels, state channels, nitrolite, ethereum scaling, layer 2, off-chain, javascript, typescript, sdk]
---

import { Card, CardGrid } from '@site/src/components/Card';

# Nitrolite SDK

The Nitrolite SDK empowers developers to build high-performance, scalable web3 applications using state channels. It's designed to provide near-instant transactions and significantly improved user experiences by minimizing direct blockchain interactions.

The SDK is built with a framework-agnostic core, making it suitable for a wide range of JavaScript and TypeScript projects, whether you're working with React, Vue, Angular, Svelte, or other environments.

<CardGrid cols={2}>
  <Card
    title="NitroliteClient"
    description="The primary client interface for managing and interacting with state channels."
    to="./nitrolite_client" 
  />
  <Card
    title="Nitrolite RPC"
    description="The underlying real-time communication protocol for off-chain state channel messaging."
    to="./nitrolite_rpc"
  />
</CardGrid>

## Getting Started

- **Instant Transactions**: Off-chain operations mean no waiting for block confirmations.
- **Minimal Gas Fees**: On-chain gas is primarily for channel opening and settlement.
- **High Throughput**: Capable of handling thousands of transactions per second.
- **Application Flexibility**: Ideal for games, payment systems, real-time interactions, and more.

To begin using the Nitrolite SDK in your project:

```bash
npm install @erc7824/nitrolite
# or
yarn add @erc7824/nitrolite
# or
pnpm add @erc7824/nitrolite
```

## Core SDK Architecture

The Nitrolite SDK is designed with modularity and broad compatibility in mind:

1.  **NitroliteClient**: This is the main entry point for developers. It provides a high-level API to manage the lifecycle of state channels, including deposits, channel creation, application session management, and withdrawals.
2.  **Nitrolite RPC**: This component handles the secure, real-time, off-chain communication between channel participants and the broker. It's responsible for message signing, verification, and routing.

## Key Concepts

Understanding these concepts is fundamental to working with Nitrolite:

- **State Channels**: Off-chain mechanisms where participants can transact freely and securely, with the underlying blockchain ensuring the finality and security of funds.
- **Channel Lifecycle**: The typical flow involves depositing funds into a custody contract, creating a channel, performing off-chain operations within an application session, closing the channel, and withdrawing funds.
- **Intent-Based State**: State transitions are driven by cryptographically signed "intents" that propose changes to allocations or application state.
- **Authentication**: Secure identity verification is achieved through cryptographic signatures, ensuring all actions are authorized.
- **Application Sessions**: Specific instances of an application logic running within a state channel, defined by participants, rules, and initial state.

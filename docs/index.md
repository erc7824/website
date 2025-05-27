---
sidebar_position: 1
title: Introduction
description: Build scalable web3 applications with state channels using Nitrolite.
keywords: [erc7824, statechannels, state channels, nitrolite, ethereum scaling, layer 2, off-chain, javascript, typescript, sdk]
---

import { Card, CardGrid } from '@site/src/components/Card';

# Introduction

Welcome to Nitrolite! Built on the ERC-7824 standard, Nitrolite is a powerful state channel framework that enables developers to build high-performance decentralized applications with near-instant finality and minimal gas costs.

The following guides will walk you through the complete lifecycle of state channels in Nitrolite, from client initialization to channel creation, application sessions, and final settlement. Whether you're building payment systems, games, financial applications, or any use case requiring high-frequency transactions, Nitrolite provides the infrastructure you need.

<CardGrid cols={2}>
  <Card 
    title="🚀 Quick Start" 
    description="Set up your first Nitrolite application with step-by-step instructions."
    to="/quick_start"
  />
  <Card 
    title="⚙️ Initialize the Client" 
    description="Configure the Nitrolite client to access state channel functionality."
    to="/quick_start/initializing_client"
  />
  <Card 
    title="💰 Deposit And Create Channel" 
    description="Fund your state channel with assets and establish a secure connection between participants."
    to="/quick_start/deposit_and_create_channel"
  />
  <Card 
    title="🔗 Connect to the ClearNode" 
    description="Establish connection with ClearNode for reliable off-chain transaction processing and verification."
    to="/quick_start/connect_to_the_clearnode"
  />
  <Card 
    title="📊 Channel Assets" 
    description="Monitor and manage the assets and allocations within your active state channels."
    to="/quick_start/balances"
  />
  <Card 
    title="🎮 Create Application Session" 
    description="Initialize a new application instance within your channel"
    to="/quick_start/application_session"
  />
  <Card 
    title="🏁 Close Application Session" 
    description="Properly finalize an application session while preserving final state and balances."
    to="/quick_start/close_session"
  />
  <Card 
    title="📏 Resize Channel"
    description="Adjust the funds locked in a channel to accommodate changing transaction requirements."
    to="/quick_start/resize_channel"
  />
  <Card 
    title="🔐 Close Channel"
    description="Properly shut down a state channel and settle the final state on-chain."
    to="/quick_start/close_channel"
  />
  <Card 
    title="💸 Withdrawal"
    description="Reclaim your funds from the state channel contract after channel closure."
    to="/quick_start/withdrawal"
  />
</CardGrid>

## Key Features

- **Instant Transactions**: Off-chain operations mean no waiting for block confirmations.
- **Minimal Gas Fees**: On-chain gas is primarily for channel opening and settlement.
- **High Throughput**: Capable of handling thousands of transactions per second.
- **Application Flexibility**: Ideal for games, payment systems, real-time interactions, and more.

## Core SDK Architecture

The Nitrolite SDK is designed with modularity and broad compatibility in mind:

1. **NitroliteClient**: This is the main entry point for developers. It provides a high-level API to manage the lifecycle of state channels, including deposits, channel creation, application session management, and withdrawals.

2. **Nitrolite RPC**: This component handles the secure, real-time, off-chain communication between channel participants and the broker. It's responsible for message signing, verification, and routing.

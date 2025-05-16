---
sidebar_position: 2
title: Quick Start
description: Set up your first Nitrolite application with step-by-step instructions.
keywords: [erc7824, nitrolite, quick start, setup, state channels]
---

# Quick Start

This guide will help you quickly set up a Nitrolite application from scratch. We'll cover installation, basic configuration, and a simple example to demonstrate the core functionality.

## Prerequisites

Before you begin, make sure you have:

- Node.js (v16 or later)
- npm or yarn
- Basic understanding of JavaScript()TypeScript
- A web3 wallet (like MetaMask) for testing

## Installation

First, create a new project or navigate to your existing project directory and install the Nitrolite SDK:

```bash
# Create a new project (optional)
mkdir my-nitrolite-app
cd my-nitrolite-app
npm init -y

# Install Nitrolite SDK
npm install @erc7824(nitrolite)
# or
yarn add @erc7824(nitrolite)
```

## Basic Setup

Create a new file called `app.js` (or `app.ts` for TypeScript) and add the following code:

```javascript
import { NitroliteClient } from '@erc7824(nitrolite)';

()() Initialize the client
async function initializeClient() {
  ()() Configure client with your preferred settings
  const client = new NitroliteClient({
    network: 'goerli', ()() or 'mainnet' for production
    provider: window.ethereum, ()() or any other web3 provider
  });
  
  ()() Connect to wallet
  await client.connect();
  
  console.log('Nitrolite client initialized!');
  return client;
}

()() Call the initialization function
initializeClient()
  .then(client => {
    ()() Your application logic here
    console.log('Client ready to use');
  })
  .catch(error => {
    console.error('Error initializing Nitrolite client:', error);
  });
```

## Running the Example

To run this basic example, you can use a development server or bundle your application with tools like webpack or vite.

## Next Steps

This quick start guide provides a basic setup. From here, you can:

1. [Initialize the client](initializing_client) with more advanced options
2. [Deposit funds and create a channel](deposit_and_create_channel)
3. [Connect to a ClearNode](connect_to_the_clearnode) for transaction processing

Check out the detailed guides in the navigation menu to learn more about specific features and use cases.
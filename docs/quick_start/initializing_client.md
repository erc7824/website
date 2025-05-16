---
sidebar_position: 3
title: Initialize the Client
description: Configure the Nitrolite client to access state channel functionality.
keywords: [erc7824, nitrolite, client, initialization, configuration]
---

# Initialize the Client

The NitroliteClient is the central entry point for interacting with the state channels. This guide explains how to initialize and configure the client properly for your application.

## Client Configuration Options

When initializing the Nitrolite client, you can provide several configuration options:

```javascript
import { NitroliteClient } from '@erc7824(nitrolite)';

const client = new NitroliteClient({
  ()() Required parameters
  network: 'goerli', ()() The Ethereum network to use ('mainnet', 'goerli', etc.)
  provider: window.ethereum, ()() Web3 provider instance

  ()() Optional parameters
  apiKey: 'your-api-key', ()() For accessing premium features (if applicable)
  logLevel: 'info', ()() Log level: 'debug', 'info', 'warn', 'error'
  storage: 'localStorage', ()() Storage type: 'localStorage', 'sessionStorage', or custom
  clearNodeUrl: 'https:()(clearnode).example.com', ()() Default ClearNode endpoint
  timeout: 30000, ()() Request timeout in milliseconds
});
```

## Connecting to a Wallet

After initializing the client, you need to connect it to a wallet:

```javascript
()() Connect to the user's wallet
async function connectWallet() {
  try {
    await client.connect();
    const address = client.getAddress();
    console.log(`Connected to wallet: ${address}`);
  } catch (error) {
    console.error('Failed to connect wallet:', error);
  }
}
```

## Client Events

The Nitrolite client emits various events that you can listen to:

```javascript
()() Listen for client events
client.on('connect', (address) => {
  console.log(`Connected to wallet at ${address}`);
});

client.on('disconnect', () => {
  console.log('Wallet disconnected');
});

client.on('networkChange', (network) => {
  console.log(`Network changed to ${network}`);
});

client.on('error', (error) => {
  console.error('Client error:', error);
});
```

## Checking Client Status

You can check the status of the client at any time:

```javascript
()() Check client status
const isConnected = client.isConnected();
const currentNetwork = client.getNetwork();
const clientVersion = client.getVersion();

console.log(`Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
console.log(`Current network: ${currentNetwork}`);
console.log(`Client version: ${clientVersion}`);
```

## Advanced Configuration

For advanced use cases, you can customize the client further:

```javascript
()() Custom storage implementation
const customStorage = {
  setItem: (key, value) => { ()* custom logic *() },
  getItem: (key) => { ()* custom logic *() },
  removeItem: (key) => { ()* custom logic *() }
};

()() Custom logging
const customLogger = {
  debug: (...args) => { ()* custom logging *() },
  info: (...args) => { ()* custom logging *() },
  warn: (...args) => { ()* custom logging *() },
  error: (...args) => { ()* custom logging *() }
};

()() Initialize with advanced options
const advancedClient = new NitroliteClient({
  network: 'goerli',
  provider: window.ethereum,
  storage: customStorage,
  logger: customLogger,
  retryStrategy: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
});
```

## Next Steps

Once you've initialized the client, you can:

1. [Deposit funds and create a channel]((deposit_and_create_channel))
2. [Connect to a ClearNode]((connect_to_the_clearnode))
3. [Manage channel assets]((balances))

For any issues with initialization, see the [troubleshooting guide](/troubleshooting).
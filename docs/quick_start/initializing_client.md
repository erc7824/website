---
sidebar_position: 3
title: Initialize the Client
description: Configure the Nitrolite client to access state channel functionality.
keywords: [erc7824, nitrolite, client, initialization, configuration]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Initialize the Client

The NitroliteClient is the central entry point for interacting with state channels. This guide explains how to initialize and configure the client properly for your application.

## Understanding Key Components

Before we dive into initialization, it's important to understand the three key components required for Nitrolite:

1. **Public Client**: Used for reading blockchain data and state.
2. **Wallet Client**: Used for on-chain transactions like depositing funds, creating channels, etc.
3. **State Wallet Client**: Used for off-chain operations within state channels, primarily for signing messages.

## Why Separate Wallets?

Nitrolite uses separate wallet clients for on-chain and off-chain operations for several important reasons:

- **Security**: Keeps your main wallet's key separate from state channel operations
- **Performance**: Off-chain operations need a more lightweight and faster signing mechanism
- **User Experience**: Allows state channel operations without requiring wallet confirmation for every message
- **Persistence**: The state wallet needs to be accessible across sessions without requiring frequent user approval

## The EIP-191 Prefix Issue

A critical detail when implementing the state wallet is handling message signing correctly:

- **Standard wallets** (like MetaMask) automatically add an EIP-191 prefix to messages (`"\x19Ethereum Signed Message:\n" + message.length + message`)
- **State channel protocols** often require signing raw messages WITHOUT this prefix for consensus compatibility
- **Nitrolite requires** direct signing of raw message bytes for correct off-chain state validation

This is why we need to use a custom signing implementation with `wallet.signingKey.sign(raw)` rather than the standard `signMessage` method. Using the wrong signing method will cause channel operations to fail.

## Basic Client Initialization

Here's a basic example of initializing the Nitrolite client using the Sepolia testnet:

```javascript
import { NitroliteClient } from '@erc7824/nitrolite';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { ethers } from 'ethers';

// Step 1: Set up configuration
async function initializeNitrolite() {
  try {
    // Contract addresses on Sepolia
    const contractAddresses = {
      custody: '0xYourCustodyContractAddress',
      adjudicator: '0xYourAdjudicatorContractAddress',
      guestAddress: '0xDefaultGuestAddress',
      tokenAddress: '0xYourTokenAddress',
    };

    // Step 2: Create a public client for reading blockchain data
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http('https://rpc.sepolia.org'),
    });

    // Step 3: Connect to the user's wallet for on-chain transactions
    // Check if MetaMask is available
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];

    // Create the wallet client using the Ethereum provider
    const walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(window.ethereum),
      account: address,
    });

    // Step 4: Create or retrieve a state wallet for off-chain operations
    // This wallet is used for signing state channel messages
    let stateWalletPrivateKey = localStorage.getItem('nitrolite_state_wallet_key');
    
    // Generate a new private key if one doesn't exist
    if (!stateWalletPrivateKey) {
      stateWalletPrivateKey = generatePrivateKey();
      localStorage.setItem('nitrolite_state_wallet_key', stateWalletPrivateKey);
    }
    
    // Create the state wallet account
    const stateWalletAccount = privateKeyToAccount(stateWalletPrivateKey);
    
    // Create a state wallet client with the signing capabilities Nitrolite needs
    // IMPORTANT: We need to sign raw messages WITHOUT the EIP-191 prefix
    const stateWalletClient = {
      account: {
        address: stateWalletAccount.address,
      },
      signMessage: async ({ message: { raw } }) => {
        // Using ethers.js to sign the raw message without EIP-191 prefix
        const wallet = new ethers.Wallet(stateWalletPrivateKey);
        const { serialized: signature } = wallet.signingKey.sign(raw);
        return signature;
      },
    };

    // Step 5: Create the Nitrolite client
    const client = new NitroliteClient({
      publicClient,
      walletClient,
      stateWalletClient,
      account: walletClient.account,
      chainId: sepolia.id,
      challengeDuration: 86400, // 24 hours in seconds
      addresses: contractAddresses,
    });

    console.log('Nitrolite client initialized successfully!');
    return client;
  } catch (error) {
    console.error('Failed to initialize Nitrolite client:', error);
    throw error;
  }
}
```

## State Wallet Storage Strategies

You can implement different storage strategies for the state wallet private key:

```javascript
// Option 1: Local Storage (simplest, but less secure)
function getStateWalletFromLocalStorage() {
  const key = localStorage.getItem('nitrolite_state_wallet_key');
  if (!key) {
    const newKey = generatePrivateKey();
    localStorage.setItem('nitrolite_state_wallet_key', newKey);
    return newKey;
  }
  return key;
}

// Option 2: Encrypted Storage
function getStateWalletFromEncryptedStorage(userPassword) {
  const encryptedKey = localStorage.getItem('nitrolite_encrypted_key');
  if (!encryptedKey) {
    const newKey = generatePrivateKey();
    const encryptedNewKey = encryptWithPassword(newKey, userPassword);
    localStorage.setItem('nitrolite_encrypted_key', encryptedNewKey);
    return newKey;
  }
  return decryptWithPassword(encryptedKey, userPassword);
}

// Helper functions for encryption (implementation depends on your encryption library)
function encryptWithPassword(data, password) {
  // Implement encryption logic
}

function decryptWithPassword(encryptedData, password) {
  // Implement decryption logic
}
```

## Integrating with Different Web Frameworks

While the core initialization logic remains the same, here's how you can adapt it for different frameworks:

<Tabs>
  <TabItem value="react" label="React">

```javascript
import { useState, useEffect } from 'react';

function useNitroliteClient() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const nitroliteClient = await initializeNitrolite();
        setClient(nitroliteClient);
        setError(null);
      } catch (err) {
        setError(err.message);
        setClient(null);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  return { client, loading, error };
}
```

  </TabItem>
  <TabItem value="angular" label="Angular">

```typescript
// In an Angular service
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NitroliteService {
  private clientSource = new BehaviorSubject<any>(null);
  private loadingSource = new BehaviorSubject<boolean>(true);
  private errorSource = new BehaviorSubject<string | null>(null);

  client$ = this.clientSource.asObservable();
  loading$ = this.loadingSource.asObservable();
  error$ = this.errorSource.asObservable();

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      this.loadingSource.next(true);
      const nitroliteClient = await initializeNitrolite();
      this.clientSource.next(nitroliteClient);
      this.errorSource.next(null);
    } catch (err) {
      this.errorSource.next(err.message);
      this.clientSource.next(null);
    } finally {
      this.loadingSource.next(false);
    }
  }
}

// In a component
import { Component, OnInit } from '@angular/core';
import { NitroliteService } from './nitrolite.service';

@Component({
  selector: 'app-nitrolite',
  template: `
    <div *ngIf="loading">Loading Nitrolite client...</div>
    <div *ngIf="error">Error: {{ error }}</div>
    <div *ngIf="client">Client initialized successfully!</div>
  `
})
export class NitroliteComponent implements OnInit {
  client: any;
  loading = true;
  error: string | null = null;

  constructor(private nitroliteService: NitroliteService) {}

  ngOnInit() {
    this.nitroliteService.client$.subscribe(client => this.client = client);
    this.nitroliteService.loading$.subscribe(loading => this.loading = loading);
    this.nitroliteService.error$.subscribe(error => this.error = error);
  }
}
```

  </TabItem>
  <TabItem value="vue" label="Vue">

```javascript
// In a Vue component
export default {
  data() {
    return {
      client: null,
      loading: true,
      error: null
    }
  },
  async mounted() {
    try {
      this.loading = true;
      this.client = await initializeNitrolite();
      this.error = null;
    } catch (err) {
      this.error = err.message;
      this.client = null;
    } finally {
      this.loading = false;
    }
  }
}
```

  </TabItem>
  <TabItem value="svelte" label="Svelte">

```javascript
<script>
  import { onMount } from 'svelte';
  
  let client = null;
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      loading = true;
      client = await initializeNitrolite();
      error = null;
    } catch (err) {
      error = err.message;
      client = null;
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <p>Loading Nitrolite client...</p>
{:else if error}
  <p class="error">Error: {error}</p>
{:else}
  <p>Nitrolite client initialized successfully!</p>
{/if}
```

  </TabItem>
  <TabItem value="nodejs" label="Node.js">

```javascript
const { NitroliteClient } = require('@erc7824/nitrolite');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');
const { ethers } = require('ethers');
const fs = require('fs');

async function initializeNodeClient() {
  try {
    console.log('Initializing Nitrolite client...');
    
    // Contract addresses on Sepolia
    const contractAddresses = {
      custody: '0xYourCustodyContractAddress',
      adjudicator: '0xYourAdjudicatorContractAddress',
      guestAddress: '0xDefaultGuestAddress',
      tokenAddress: '0xYourTokenAddress',
    };

    // Create a public client for reading blockchain data
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http('https://rpc.sepolia.org'),
    });

    // Load or create wallet for on-chain transactions
    let onChainPrivateKey;
    const keyPath = './keys/on-chain-key.json';
    
    try {
      if (fs.existsSync(keyPath)) {
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        onChainPrivateKey = keyData.privateKey;
      } else {
        // Generate new key for demo purposes (in production, use a secure key)
        onChainPrivateKey = ethers.Wallet.createRandom().privateKey;
        fs.mkdirSync('./keys', { recursive: true });
        fs.writeFileSync(keyPath, JSON.stringify({ privateKey: onChainPrivateKey }));
      }
    } catch (error) {
      console.error('Failed to load or create on-chain wallet:', error);
      throw error;
    }
    
    // Create wallet account
    const account = privateKeyToAccount(onChainPrivateKey);
    
    // Create wallet client
    const walletClient = {
      account: {
        address: account.address,
      },
      sendTransaction: async (tx) => {
        const wallet = new ethers.Wallet(onChainPrivateKey, 
          new ethers.providers.JsonRpcProvider('https://rpc.sepolia.org'));
        return wallet.sendTransaction(tx);
      }
    };
    
    // Load or create state wallet for off-chain operations
    let stateWalletPrivateKey;
    const stateKeyPath = './keys/state-wallet-key.json';
    
    try {
      if (fs.existsSync(stateKeyPath)) {
        const keyData = JSON.parse(fs.readFileSync(stateKeyPath, 'utf8'));
        stateWalletPrivateKey = keyData.privateKey;
      } else {
        stateWalletPrivateKey = ethers.Wallet.createRandom().privateKey;
        fs.writeFileSync(stateKeyPath, JSON.stringify({ privateKey: stateWalletPrivateKey }));
      }
    } catch (error) {
      console.error('Failed to load or create state wallet:', error);
      throw error;
    }
    
    // Create state wallet with raw signing capability
    const stateWallet = new ethers.Wallet(stateWalletPrivateKey);
    const stateWalletClient = {
      account: {
        address: stateWallet.address,
      },
      signMessage: async ({ message: { raw } }) => {
        const { serialized: signature } = stateWallet.signingKey.sign(raw);
        return signature;
      }
    };
    
    // Create Nitrolite client
    const client = new NitroliteClient({
      publicClient,
      walletClient,
      stateWalletClient,
      account: walletClient.account,
      chainId: sepolia.id,
      challengeDuration: 86400,
      addresses: contractAddresses,
    });
    
    console.log('Nitrolite client initialized successfully!');
    return client;
  } catch (error) {
    console.error('Failed to initialize Nitrolite client:', error);
    throw error;
  }
}

// Run the initialization
initializeNodeClient()
  .then(client => {
    console.log('Client ready to use');
    // Start your application logic here
  })
  .catch(error => {
    console.error('Initialization failed:', error);
    process.exit(1);
  });
```

  </TabItem>
</Tabs>

## Next Steps

Once you've initialized the client, you can:

1. [Deposit funds and create a channel](deposit_and_create_channel)
2. [Connect to a ClearNode](connect_to_the_clearnode)
3. [Manage channel assets](balances)

For any issues with initialization, check the client's error events or console logs for detailed error messages.
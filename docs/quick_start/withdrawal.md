---
sidebar_position: 12
title: Withdrawal
description: Reclaim your funds from the custody contract that aren't locked in active channels.
keywords: [erc7824, nitrolite, withdrawal, state channels, custody contract, tokens]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Withdrawal

The `withdrawal` method allows you to withdraw tokens that were previously deposited into the custody contract but are not currently locked in active channels. This guide explains how to use this method to reclaim your available funds.

## Understanding Withdrawals in Nitrolite

In Nitrolite, your funds generally exist in two states:

1. **Locked in active channels**: Funds that are currently allocated to state channels
2. **Available in custody**: Funds that have been deposited but are not allocated to any channel

The `withdrawal` method specifically targets the second category - funds that are available in the custody contract but not locked in any active channel.

## Method Signature

```typescript
/**
 * Withdraws tokens previously deposited into the custody contract.
 * This does not withdraw funds locked in active channels.
 * @param amount The amount of tokens/ETH to withdraw.
 * @returns The transaction hash.
 */
async withdrawal(amount: bigint): Promise<Hash> {
    const tokenAddress = this.addresses.tokenAddress;

    try {
        return await this.nitroliteService.withdraw(tokenAddress, amount);
    } catch (err) {
        throw new Errors.ContractCallError("Failed to execute withdrawDeposit on contract", err as Error);
    }
}
```

## Prerequisites for Withdrawal

Before attempting to withdraw funds, ensure:

1. You have a properly initialized client (see [Initializing Client](initializing_client))
2. You have non-zero available balance in the custody contract
3. Your wallet is connected and has enough ETH for gas fees

## Checking Available Balance

Before withdrawing, check how much is available for withdrawal:

```javascript
// Get account information, including available funds
const accountInfo = await client.getAccountInfo();

// Display available funds (not locked in channels)
console.log('Available for withdrawal:', accountInfo.available);
console.log('Locked in channels:', accountInfo.locked);

// Check if withdrawal is possible
if (accountInfo.available <= 0n) {
  console.log('No funds available for withdrawal');
  return;
}
```

## Basic Withdrawal Example

Here's a simple example of withdrawing all available funds:

```javascript
// Get account information
const accountInfo = await client.getAccountInfo();

// Ensure there are funds available to withdraw
if (accountInfo.available <= 0n) {
  console.log('No funds available for withdrawal');
  return;
}

try {
  // Withdraw all available funds
  const txHash = await client.withdrawal(accountInfo.available);
  console.log('Withdrawal transaction submitted:', txHash);
  
  // Transaction hash can be used to check status on a block explorer
  console.log(`View transaction: https://sepolia.etherscan.io/tx/${txHash}`);
} catch (error) {
  console.error('Withdrawal failed:', error);
}
```

## Complete React Implementation

Here's a more comprehensive implementation in a React component:

<Tabs>
  <TabItem value="react" label="React">

```jsx
import { useEffect, useState, useCallback } from 'react';

function WithdrawalComponent({ client }) {
  const [accountInfo, setAccountInfo] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  
  // Function to fetch account information
  const fetchAccountInfo = useCallback(async () => {
    if (!client) return;
    
    try {
      const info = await client.getAccountInfo();
      setAccountInfo(info);
    } catch (err) {
      console.error('Failed to fetch account info:', err);
      setError('Failed to load account information');
    }
  }, [client]);
  
  // Load account info when component mounts or client changes
  useEffect(() => {
    fetchAccountInfo();
  }, [client, fetchAccountInfo]);
  
  // Function to handle withdrawal
  const handleWithdrawal = async () => {
    if (!client || !accountInfo) {
      setError('Client not initialized or account info not loaded');
      return;
    }
    
    // Check if there are funds available to withdraw
    if (!accountInfo.available || accountInfo.available <= 0n) {
      setError('No funds available for withdrawal');
      return;
    }
    
    setIsWithdrawing(true);
    setError(null);
    setTxHash(null);
    
    try {
      // Withdraw all available funds
      const hash = await client.withdrawal(accountInfo.available);
      setTxHash(hash);
      console.log('Withdrawal transaction hash:', hash);
      
      // Refresh account info after withdrawal
      await fetchAccountInfo();
    } catch (err) {
      setError(err.message);
      console.error('Withdrawal failed:', err);
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  // Helper function to format bigint for display
  const formatAmount = (amount) => {
    if (!amount) return '0';
    return (Number(amount) / 1e6).toFixed(6); // Assuming 6 decimals for USDC
  };
  
  if (!client) {
    return <div>Client not initialized</div>;
  }
  
  return (
    <div>
      <h2>Withdraw Available Funds</h2>
      
      {accountInfo && (
        <div>
          <p>Available for withdrawal: {formatAmount(accountInfo.available)} USDC</p>
          <p>Locked in channels: {formatAmount(accountInfo.locked)} USDC</p>
        </div>
      )}
      
      <button 
        onClick={handleWithdrawal} 
        disabled={
          isWithdrawing || 
          !accountInfo || 
          !accountInfo.available || 
          accountInfo.available <= 0n
        }
      >
        {isWithdrawing ? 'Processing...' : 'Withdraw All Available Funds'}
      </button>
      
      {txHash && (
        <div>
          <p>Transaction submitted: {txHash}</p>
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View on Etherscan
          </a>
        </div>
      )}
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
```

  </TabItem>
  <TabItem value="vue" label="Vue">

```vue
<template>
  <div>
    <h2>Withdraw Available Funds</h2>
    
    <div v-if="accountInfo">
      <p>Available for withdrawal: {{ formatAmount(accountInfo.available) }} USDC</p>
      <p>Locked in channels: {{ formatAmount(accountInfo.locked) }} USDC</p>
    </div>
    
    <button 
      @click="handleWithdrawal" 
      :disabled="isWithdrawing || !accountInfo || !accountInfo.available || accountInfo.available <= 0n"
    >
      {{ isWithdrawing ? 'Processing...' : 'Withdraw All Available Funds' }}
    </button>
    
    <div v-if="txHash">
      <p>Transaction submitted: {{ txHash }}</p>
      <a 
        :href="`https://sepolia.etherscan.io/tx/${txHash}`" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        View on Etherscan
      </a>
    </div>
    
    <p v-if="error" style="color: red">Error: {{ error }}</p>
  </div>
</template>

<script>
export default {
  props: {
    client: {
      type: Object,
      required: true
    }
  },
  
  data() {
    return {
      accountInfo: null,
      isWithdrawing: false,
      txHash: null,
      error: null
    }
  },
  
  methods: {
    async fetchAccountInfo() {
      if (!this.client) return;
      
      try {
        this.accountInfo = await this.client.getAccountInfo();
      } catch (err) {
        console.error('Failed to fetch account info:', err);
        this.error = 'Failed to load account information';
      }
    },
    
    async handleWithdrawal() {
      if (!this.client || !this.accountInfo) {
        this.error = 'Client not initialized or account info not loaded';
        return;
      }
      
      // Check if there are funds available to withdraw
      if (!this.accountInfo.available || this.accountInfo.available <= 0n) {
        this.error = 'No funds available for withdrawal';
        return;
      }
      
      this.isWithdrawing = true;
      this.error = null;
      this.txHash = null;
      
      try {
        // Withdraw all available funds
        this.txHash = await this.client.withdrawal(this.accountInfo.available);
        console.log('Withdrawal transaction hash:', this.txHash);
        
        // Refresh account info after withdrawal
        await this.fetchAccountInfo();
      } catch (err) {
        this.error = err.message;
        console.error('Withdrawal failed:', err);
      } finally {
        this.isWithdrawing = false;
      }
    },
    
    formatAmount(amount) {
      if (!amount) return '0';
      return (Number(amount) / 1e6).toFixed(6); // Assuming 6 decimals for USDC
    }
  },
  
  mounted() {
    this.fetchAccountInfo();
  },
  
  watch: {
    client() {
      this.fetchAccountInfo();
    }
  }
}
</script>
```

  </TabItem>
</Tabs>

## Handling Withdrawal in an Application

For a more complete integration example, let's see how to implement this in a React component that might be part of a larger application:

```jsx
import { useCallback, useState } from 'react';

function WithdrawalSection({ nitroSnap, walletSnap, isConnected, chainId }) {
  const [loading, setLoading] = useState(false);
  
  // Function to refresh account information
  const getAccountInfo = useCallback(async () => {
    if (nitroSnap.client) {
      return await nitroSnap.client.getAccountInfo();
    }
  }, [nitroSnap.client]);
  
  // Function to refresh participants information
  const getParticipants = useCallback(async () => {
    if (nitroSnap.client) {
      return await nitroSnap.client.getParticipants();
    }
  }, [nitroSnap.client]);
  
  const handleWithdrawal = useCallback(async () => {
    if (!isConnected || !walletSnap.walletAddress || !nitroSnap.client || !chainId) {
      console.error('WebSocket not connected, wallet not connected, client not initialized, or no active chain');
      return;
    }
    
    setLoading(true);
    try {
      if (!nitroSnap.accountInfo?.available || nitroSnap.accountInfo.available <= 0n) {
        console.warn('No funds to withdraw');
        return;
      }
      
      // Initiate withdrawal with available funds
      const txHash = await nitroSnap.client.withdrawal(nitroSnap.accountInfo.available);
      console.log('Withdrawal transaction hash:', txHash);
      
      // Refresh account and participants information after withdrawal
      await Promise.all([getAccountInfo(), getParticipants()]);
      
      console.log('Withdrawal successful');
    } catch (error) {
      console.error('Withdrawal failed:', error);
    } finally {
      setLoading(false);
    }
  }, [
    isConnected,
    walletSnap.walletAddress,
    nitroSnap.client,
    nitroSnap.accountInfo,
    chainId,
    getAccountInfo,
    getParticipants,
  ]);
  
  return (
    <div>
      <h3>Withdraw Available Funds</h3>
      
      {nitroSnap.accountInfo && (
        <p>
          Available: {(Number(nitroSnap.accountInfo.available) / 1e6).toFixed(6)} USDC
        </p>
      )}
      
      <button 
        onClick={handleWithdrawal}
        disabled={
          loading || 
          !isConnected || 
          !nitroSnap.client || 
          !nitroSnap.accountInfo?.available || 
          nitroSnap.accountInfo.available <= 0n
        }
      >
        {loading ? 'Processing...' : 'Withdraw Funds'}
      </button>
    </div>
  );
}
```

## Important Considerations

1. **Distinction from Channel Funds**: The `withdrawal` method only affects funds that are available in the custody contract - it cannot withdraw funds that are locked in active channels. To access funds in channels, you must first close those channels.

2. **Gas Costs**: Withdrawals are on-chain transactions that require gas fees. Ensure your wallet has enough ETH to cover these costs.

3. **Transaction Confirmation**: The method returns a transaction hash immediately, but the actual withdrawal may take some time to be confirmed on the blockchain.

4. **Error Handling**: Implement proper error handling as shown in the examples above. Withdrawals can fail for various reasons including:
   - Insufficient gas
   - Network congestion
   - Contract reverts
   - Wallet permissions

5. **Amount Parameter**: The amount should be specified as a bigint value in the smallest unit of the token (e.g., for USDC with 6 decimals, 1 USDC = 1,000,000 units).

## Next Steps

After successfully withdrawing your available funds, you might want to:

1. [Close your channels](close_channel) if you still have funds locked in active channels
2. [Create new channels](deposit_and_create_channel) with different parameters
3. [Resize your existing channels](resize_channel) to adjust capacity

For more detailed information about working with state channels, check the [Nitrolite Client Reference](../nitrolite_client) section.
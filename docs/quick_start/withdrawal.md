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

## Prerequisites for Withdrawal

Before attempting to withdraw funds, ensure:

1. You have a properly initialized client (see [Initializing Client](initializing_client))
2. You have non-zero available balance in the custody contract
3. Your wallet is connected and has enough ETH for gas fees

## Implementing Withdrawal

Here's how to implement withdrawals in different frameworks:

<Tabs>
  <TabItem value="react" label="React">

```javascript
import { useCallback } from 'react';

// Hook for handling withdrawals from the custody contract
export function useWithdrawal() {
  // Main withdrawal function
  const handleWithdrawal = useCallback(async () => {
    // 1. Check prerequisites
    if (!isConnected || !walletAddress || !client || !chainId) {
      console.error('Missing requirements: WebSocket, wallet, client, or chain');
      return { success: false, error: 'Connection prerequisites not met' };
    }

    setLoading(true);

    try {
      // 2. Verify available funds
      if (!accountInfo?.available || accountInfo.available <= 0n) {
        console.warn('No funds available to withdraw');
        return { success: false, error: 'No available funds' };
      }

      // 3. Execute withdrawal for all available funds
      const txHash = await client.withdrawal(accountInfo.available);

      // 4. Refresh account data
      await refreshAccountData();

      console.log('Withdrawal successful, transaction:', txHash);
      return { success: true, txHash };
    } catch (error) {
      console.error('Withdrawal failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  }, [
    isConnected,
    walletAddress,
    client,
    accountInfo,
    chainId,
    refreshAccountData
  ]);

  // Function to withdraw a specific amount
  const withdrawSpecificAmount = useCallback(async (amount) => {
    if (!client) {
      return { success: false, error: 'Client not initialized' };
    }

    if (!amount || amount <= 0n) {
      return { success: false, error: 'Invalid amount' };
    }

    setLoading(true);

    try {
      // Ensure amount doesn't exceed available balance
      if (accountInfo?.available && amount > accountInfo.available) {
        return { 
          success: false, 
          error: 'Amount exceeds available balance' 
        };
      }

      // Execute withdrawal for specified amount
      const txHash = await client.withdrawal(amount);
      
      // Refresh account data
      await refreshAccountData();
      
      return { success: true, txHash };
    } catch (error) {
      console.error('Withdrawal failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  }, [client, accountInfo, refreshAccountData]);

  return { handleWithdrawal, withdrawSpecificAmount };
}

// Usage example
async function exampleUsage() {
  const { handleWithdrawal } = useWithdrawal();
  const result = await handleWithdrawal();
  
  if (result.success) {
    console.log(`Withdrawal successful! Transaction: ${result.txHash}`);
  } else {
    console.error(`Withdrawal failed: ${result.error}`);
  }
}
```

  </TabItem>
  <TabItem value="nodejs" label="Node.js">

```javascript
import { ethers } from 'ethers';

/**
 * Withdraw funds from the custody contract
 * @param {object} client - Nitrolite client
 * @param {object} account - Account information containing available balance
 * @param {boolean} withdrawAll - Whether to withdraw all available funds
 * @param {bigint} amount - Optional specific amount to withdraw
 * @returns {Promise<object>} Result with transaction hash
 */
async function withdrawFunds(client, account, withdrawAll = true, amount = null) {
  try {
    // 1. Check prerequisites
    if (!client) {
      throw new Error('Client not initialized');
    }

    // 2. Check available balance
    if (!account || !account.available || account.available <= 0n) {
      console.warn('No funds available to withdraw');
      return { success: false, error: 'No available funds' };
    }

    let withdrawAmount;
    
    if (withdrawAll) {
      // Withdraw all available funds
      withdrawAmount = account.available;
    } else if (amount) {
      // Withdraw specific amount
      if (amount <= 0n) {
        return { success: false, error: 'Amount must be greater than 0' };
      }
      
      if (amount > account.available) {
        return { 
          success: false, 
          error: `Amount exceeds available balance (${amount} > ${account.available})` 
        };
      }
      
      withdrawAmount = amount;
    } else {
      return { success: false, error: 'Either withdrawAll or amount must be specified' };
    }

    console.log(`Withdrawing ${withdrawAmount} from custody contract...`);

    // 3. Execute withdrawal
    const txHash = await client.withdrawal(withdrawAmount);
    
    console.log(`Withdrawal successful! Transaction: ${txHash}`);
    return { success: true, txHash };
  } catch (error) {
    console.error('Withdrawal failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Usage example
async function main() {
  try {
    // Initialize client (simplified)
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum-rpc-url');
    const wallet = new ethers.Wallet('your-private-key', provider);
    const client = await initializeClient(wallet, provider);
    
    // Get account information
    const accountInfo = await client.getAccountInfo();
    console.log(`Available balance: ${accountInfo.available}`);
    
    // Withdraw all funds
    const result = await withdrawFunds(client, accountInfo, true);
    
    if (result.success) {
      console.log(`Withdrawal complete! Transaction: ${result.txHash}`);
    } else {
      console.error(`Withdrawal failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}
```

  </TabItem>
  <TabItem value="angular" label="Angular">

```typescript
// withdrawal.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WithdrawalService {
  constructor() {}
  
  /**
   * Withdraw all available funds from custody contract
   */
  public withdrawAllFunds(client: any, accountInfo: any): Observable<any> {
    // Validate inputs
    if (!client || !accountInfo) {
      return from(Promise.resolve({
        success: false,
        error: 'Client or account info not provided'
      }));
    }
    
    if (!accountInfo.available || accountInfo.available <= 0n) {
      return from(Promise.resolve({
        success: false,
        error: 'No available funds to withdraw'
      }));
    }
    
    return from(this.executeWithdrawal(client, accountInfo.available)).pipe(
      map(txHash => ({
        success: true,
        txHash
      })),
      catchError(error => {
        console.error('Withdrawal failed:', error);
        return from([{
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      })
    );
  }
  
  /**
   * Withdraw a specific amount of funds
   */
  public withdrawAmount(client: any, accountInfo: any, amount: bigint): Observable<any> {
    // Validate inputs
    if (!client) {
      return from(Promise.resolve({
        success: false,
        error: 'Client not provided'
      }));
    }
    
    if (!amount || amount <= 0n) {
      return from(Promise.resolve({
        success: false,
        error: 'Invalid withdrawal amount'
      }));
    }
    
    if (!accountInfo?.available || amount > accountInfo.available) {
      return from(Promise.resolve({
        success: false,
        error: 'Amount exceeds available balance'
      }));
    }
    
    return from(this.executeWithdrawal(client, amount)).pipe(
      map(txHash => ({
        success: true,
        txHash
      })),
      catchError(error => {
        console.error('Withdrawal failed:', error);
        return from([{
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      })
    );
  }
  
  /**
   * Execute withdrawal transaction
   */
  private async executeWithdrawal(client: any, amount: bigint): Promise<string> {
    try {
      return await client.withdrawal(amount);
    } catch (error) {
      console.error('Error executing withdrawal:', error);
      throw error;
    }
  }
}

// Usage example
async function withdrawUsingService() {
  // Get service and client instances
  const service = new WithdrawalService();
  const client = getClient(); // Your nitrolite client
  
  // Get account information
  const accountInfo = await client.getAccountInfo();
  
  if (accountInfo.available > 0n) {
    // Withdraw all available funds
    service.withdrawAllFunds(client, accountInfo).subscribe({
      next: (result) => {
        if (result.success) {
          console.log(`Withdrawal successful: ${result.txHash}`);
        } else {
          console.error(`Withdrawal failed: ${result.error}`);
        }
      }
    });
  }
}
```

  </TabItem>
  <TabItem value="vue" label="Vue.js">

```javascript
import { defineComponent } from 'vue';

/**
 * Withdrawal functionality for Vue.js applications
 * Can be used in a component's setup() method
 */
export function useWithdrawal(client) {
  /**
   * Withdraw all available funds from the custody contract
   * @param {object} accountInfo - The account information containing available balance
   * @returns {Promise<object>} Result with transaction hash or error
   */
  const withdrawAllFunds = async (accountInfo) => {
    // 1. Validate requirements
    if (!client) {
      return { success: false, error: 'Client not initialized' };
    }

    if (!accountInfo?.available || accountInfo.available <= 0n) {
      return { success: false, error: 'No available funds to withdraw' };
    }

    try {
      // 2. Execute withdrawal for all available funds
      const txHash = await client.withdrawal(accountInfo.available);
      return { success: true, txHash };
    } catch (err) {
      console.error('Withdrawal failed:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  };

  /**
   * Withdraw a specific amount of funds
   * @param {object} accountInfo - The account information containing available balance
   * @param {bigint} amount - The specific amount to withdraw
   * @returns {Promise<object>} Result with transaction hash or error
   */
  const withdrawSpecificAmount = async (accountInfo, amount) => {
    // 1. Validate requirements
    if (!client) {
      return { success: false, error: 'Client not initialized' };
    }

    if (!amount || amount <= 0n) {
      return { success: false, error: 'Invalid withdrawal amount' };
    }

    if (!accountInfo?.available || amount > accountInfo.available) {
      return { 
        success: false, 
        error: 'Amount exceeds available balance' 
      };
    }

    try {
      // 2. Execute withdrawal for specified amount
      const txHash = await client.withdrawal(amount);
      return { success: true, txHash };
    } catch (err) {
      console.error('Withdrawal failed:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  };

  // Format a bigint amount to a human-readable string (assumes 6 decimals like USDC)
  const formatAmount = (amount) => {
    if (!amount) return '0';
    return (Number(amount) / 1e6).toFixed(6);
  };

  return {
    withdrawAllFunds,
    withdrawSpecificAmount,
    formatAmount
  };
}

// Usage example
async function withdrawExample() {
  // Assuming client is initialized elsewhere
  const { withdrawAllFunds, withdrawSpecificAmount } = useWithdrawal(client);
  
  // Get account information
  const accountInfo = await client.getAccountInfo();
  console.log(`Available balance: ${(Number(accountInfo.available) / 1e6).toFixed(6)}`);
  
  // Withdraw all available funds
  const result = await withdrawAllFunds(accountInfo);
  
  if (result.success) {
    console.log(`Withdrawal successful! Transaction: ${result.txHash}`);
  } else {
    console.error(`Withdrawal failed: ${result.error}`);
  }
}
```

  </TabItem>
</Tabs>

## Understanding Withdrawals

When withdrawing funds from the custody contract, here's what happens:

1. **Check available balance**: The system verifies you have sufficient available (unlocked) funds
2. **Create and submit transaction**: Your client submits a transaction to the custody contract
3. **Wait for confirmation**: The blockchain processes the transaction
4. **Receive funds**: Tokens are sent back to your wallet address

## Withdrawal Parameters

The withdrawal method takes a single parameter:

| Parameter | Type | Description | Example |
|-----------|------|-------------|--------|
| `amount` | bigint | Amount of tokens to withdraw (in smallest unit) | `1000000n` (for 1 USDC with 6 decimals) |

## Common Withdrawal Scenarios

| Scenario | Description | Implementation |
|----------|-------------|---------------|
| **Withdraw all** | Withdraw entire available balance | `client.withdrawal(accountInfo.available)` |
| **Partial withdrawal** | Withdraw specific amount | `client.withdrawal(1000000n)` |
| **After channel closure** | Withdraw funds after closing channels | First close channel, then withdraw |

## Handling Available vs. Locked Funds

It's important to understand that:

1. You can only withdraw **available** funds, not those locked in active channels
2. To withdraw locked funds, you must first close the respective channels
3. The `accountInfo` object contains both `available` and `locked` balances

```javascript
const accountInfo = await client.getAccountInfo();
console.log(`Available: ${accountInfo.available}`);

// Can only withdraw the available amount
if (accountInfo.available > 0n) {
  await client.withdrawal(accountInfo.available);
}
```

## Best Practices

When implementing withdrawals, follow these best practices:

1. **Always check available balance** before attempting withdrawal
2. **Handle transaction errors** gracefully, with proper user feedback
3. **Refresh account data** after successful withdrawal
4. **Provide transaction hash** to users for tracking purposes
5. **Consider gas costs** which are paid separately from the withdrawal amount
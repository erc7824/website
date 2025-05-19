---
sidebar_position: 6
title: Channel Balances
description: Monitor off-chain balances in your active state channels using NitroliteRPC.
keywords: [erc7824, nitrolite, balances, off-chain, ledger balances, clearnode]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Channel Balances

After connecting to a ClearNode, you'll need to monitor the off-chain balances in your state channels. This guide explains how to retrieve and work with off-chain balance information using the NitroliteRPC protocol.

## Understanding Off-Chain Balances

Off-chain balances in Nitrolite represent:

- Your current funds in the state channel
- Balances that update in real-time as transactions occur
- The source of truth for application operations
- Assets that are backed by on-chain deposits

## Checking Off-Chain Balances

To monitor your channel funds, you need to retrieve the current off-chain balances from the ClearNode.

## Understanding the Ledger Balances Request

The `get_ledger_balances` request is used to retrieve the current off-chain balances for a specific channel from the ClearNode:

- **Request params**: `[{ acc: "0xChannelId" }]` where `0xChannelId` is your channel's unique identifier
- **Response**: Array containing your balance object only (not all participants)

The response contains your address and your current balance amount in the channel. Note that the ClearNode's balance is not returned as part of this response.

```javascript
// Example response format for get_ledger_balances
{
  "res": [2, "get_ledger_balances", [[  // The nested array contains balance data
    {
      "address": "0x1234567890abcdef...",  // Your address
      "amount": 100000                  // Your balance in smallest units (e.g., for USDC with 6 decimals)
    }
  ]], 1619123456789],  // Timestamp
  "sig": ["0xabcd1234..."]
}
```

To retrieve these balances, use the `get_ledger_balances` request with the ClearNode:

<Tabs>
  <TabItem value="using-helper" label="Using SDK Helper">

```javascript
import { createGetLedgerBalancesMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

// Your message signer function (same as in auth flow)
const messageSigner = async (payload) => {
  const message = JSON.stringify(payload);
  const digestHex = ethers.id(message);
  const messageBytes = ethers.getBytes(digestHex);
  const { serialized: signature } = stateWallet.signingKey.sign(messageBytes);
  return signature;
};

// Function to get ledger balances
async function getLedgerBalances(ws, channelId) {
  return new Promise((resolve, reject) => {
    // Create a unique handler for this specific request
    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Check if this is a response to our get_ledger_balances request
      if (message.res && message.res[1] === 'get_ledger_balances') {
        // Remove the message handler to avoid memory leaks
        ws.removeEventListener('message', handleMessage);
        
        // Resolve with the balances data
        resolve(message.res[2]);
      }
    };
    
    // Add the message handler
    ws.addEventListener('message', handleMessage);
    
    // Create and send the ledger balances request
    createGetLedgerBalancesMessage(messageSigner, channelId)
      .then(message => {
        ws.send(message);
      })
      .catch(error => {
        // Remove the message handler on error
        ws.removeEventListener('message', handleMessage);
        reject(error);
      });
      
    // Set a timeout to prevent hanging indefinitely
    setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      reject(new Error('Timeout waiting for ledger balances'));
    }, 10000); // 10 second timeout
  });
}

// Usage example
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

try {
  const balances = await getLedgerBalances(ws, channelId);
  
  console.log('Channel ledger balances:', balances);
  // Example output:
  // [
  //   {
  //     "address": "0x1234567890abcdef...", // Your address
  //     "amount": 100000                   // Your balance
  //   }
  // ]
  
  // Process your balance
  if (balances[0] && balances[0].length > 0) {
    const myBalance = balances[0][0]; // The first (and only) balance entry is yours
    
    // Convert to token units if needed (e.g., USDC with 6 decimals)
    const formattedAmount = myBalance.amount / 1000000; // For USDC with 6 decimals
    
    console.log(`My balance: ${formattedAmount} USDC`);
  } else {
    console.log('No balance data available');
  }
} catch (error) {
  console.error('Failed to get ledger balances:', error);
}
```

  </TabItem>
  <TabItem value="manual" label="Manual Request">

```javascript
import { ethers } from 'ethers';
import { generateRequestId, getCurrentTimestamp } from '@erc7824/nitrolite';

// Function to create a signed ledger balances request
async function createLedgerBalancesRequest(signer, channelId) {
  const requestId = generateRequestId();
  const method = 'get_ledger_balances';
  const params = [{ acc: channelId }];
  const timestamp = getCurrentTimestamp();
  
  // Create the request structure
  const requestData = [requestId, method, params, timestamp];
  const request = { req: requestData };
  
  // Sign the request
  const message = JSON.stringify(request);
  const digestHex = ethers.id(message);
  const messageBytes = ethers.getBytes(digestHex);
  const { serialized: signature } = signer.wallet.signingKey.sign(messageBytes);
  
  // Add signature to the request
  request.sig = [signature];
  
  return { stringified: JSON.stringify(request), requestId };
}

// Function to get ledger balances
async function getLedgerBalances(ws, channelId, signer) {
  return new Promise((resolve, reject) => {
    createLedgerBalancesRequest(signer, channelId)
      .then(({ stringified, requestId }) => {
        // Set up message handler
        const handleMessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Check if this is our response
            if (message.res && 
                message.res[0] === requestId && 
                message.res[1] === 'get_ledger_balances') {
              
              // Remove the listener
              ws.removeEventListener('message', handleMessage);
              
              // Resolve with the balances data
              resolve(message.res[2]);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
        
        // Add message listener
        ws.addEventListener('message', handleMessage);
        
        // Send the request
        ws.send(stringified);
        
        // Set timeout
        setTimeout(() => {
          ws.removeEventListener('message', handleMessage);
          reject(new Error('Timeout waiting for ledger balances'));
        }, 10000);
      })
      .catch(reject);
  });
}

// Usage example
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

try {
  const balances = await getLedgerBalances(ws, channelId, stateWallet);
  
  console.log('Channel ledger balances:', balances);
  // Process and display balances
  // ...
  
} catch (error) {
  console.error('Failed to get ledger balances:', error);
}
```

  </TabItem>
</Tabs>

## Checking Balances for a Specific Channel

To retrieve off-chain balances for a specific channel, use the `createGetLedgerBalancesMessage` helper function:

```javascript
import { createGetLedgerBalancesMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

// Function to get ledger balances for a specific channel
async function getLedgerBalances(ws, channelId, messageSigner) {
  return new Promise((resolve, reject) => {
    // Message handler for the response
    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Check if this is a response to our get_ledger_balances request
        if (message.res && message.res[1] === 'get_ledger_balances') {
          // Clean up by removing the event listener
          ws.removeEventListener('message', handleMessage);
          
          // Resolve with the balance data
          resolve(message.res[2]);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    // Set up timeout to avoid hanging indefinitely
    const timeoutId = setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      reject(new Error('Timeout waiting for ledger balances'));
    }, 10000); // 10 second timeout
    
    // Add the message handler
    ws.addEventListener('message', handleMessage);
    
    // Create and send the balance request
    createGetLedgerBalancesMessage(messageSigner, channelId)
      .then(message => {
        ws.send(message);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        ws.removeEventListener('message', handleMessage);
        reject(error);
      });
  });
}

// Example usage
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

getLedgerBalances(ws, channelId, messageSigner)
  .then(balances => {
    console.log('Channel balances:', balances);
    
    // Format your balance data (assuming USDC with 6 decimals)
    if (balances[0] && balances[0].length > 0) {
      const myBalance = balances[0][0]; // The first (and only) balance entry is yours
      const formattedAmount = myBalance.amount / 1000000;
      console.log(`My balance: ${formattedAmount} USDC`);
    } else {
      console.log('No balance data available');
    }
  })
  .catch(error => {
    console.error('Failed to get ledger balances:', error);
  });
```

## Processing Balance Data

When you receive balance data from the ClearNode, it's helpful to format it for better readability:

```javascript
// Simple function to format your balance data for display
function formatMyBalance(balances, tokenDecimals = 6) {
  if (!balances || !balances[0] || !Array.isArray(balances[0]) || balances[0].length === 0) {
    return null; // No balance data available
  }
  
  // Extract your balance from the nested structure
  const myBalance = balances[0][0]; // The first (and only) balance entry is yours
  
  // Format your balance
  return {
    address: myBalance.address,
    rawAmount: myBalance.amount,
    formattedAmount: myBalance.amount / Math.pow(10, tokenDecimals)
  };
}

// Example usage
const myFormattedBalance = formatMyBalance(balancesFromClearNode);

if (myFormattedBalance) {
  console.log(`My balance: ${myFormattedBalance.formattedAmount} USDC (${myFormattedBalance.address.substring(0, 8)}...)`);
} else {
  console.log('No balance data available');
}
```

## Best Practices for Balance Checking

When working with off-chain balances, follow these best practices:

### Regular Balance Polling

Set up a regular interval to check balances, especially in active applications:

```javascript
// Simple balance monitoring function
function startBalanceMonitoring(ws, channelId, messageSigner, intervalMs = 30000) {
  // Check immediately on start
  getLedgerBalances(ws, channelId, messageSigner)
    .then(displayBalances)
    .catch(err => console.error('Initial balance check failed:', err));
  
  // Set up interval for regular checks
  const intervalId = setInterval(() => {
    getLedgerBalances(ws, channelId, messageSigner)
      .then(displayBalances)
      .catch(err => console.error('Balance check failed:', err));
  }, intervalMs); // Check every 30 seconds by default
  
  // Return function to stop monitoring
  return () => clearInterval(intervalId);
}

// Simple display function
function displayBalances(balances) {
  console.log(`Balance update at ${new Date().toLocaleTimeString()}:`);
  
  // Format and display your balance
  if (balances[0] && balances[0].length > 0) {
    const myBalance = balances[0][0]; // The first (and only) balance entry is yours
    const formattedAmount = myBalance.amount / 1000000; // For USDC with 6 decimals
    console.log(`My balance: ${formattedAmount} USDC (${myBalance.address.substring(0, 8)}...)`);
  } else {
    console.log('No balance data available');
  }
}
```

## Common Errors and Troubleshooting

When retrieving off-chain balances, you might encounter these common issues:

| Error Type | Description | Solution |
|------------|-------------|----------|
| **Authentication errors** | WebSocket connection loses authentication | Re-authenticate before requesting balances again |
| **Channel not found** | The channel ID is invalid or the channel has been closed | Verify the channel ID and check if the channel is still active |
| **Connection issues** | WebSocket disconnects during a balance request | Implement reconnection logic with exponential backoff |
| **Timeout** | The ClearNode does not respond in a timely manner | Set appropriate timeouts and implement retry logic |

## Next Steps

Now that you understand how to monitor off-chain balances in your channels, you can:

1. [Create an application session](application_session) to start transacting off-chain 
2. [Resize your channel](resize_channel) if you need to adjust fund allocation
3. Learn about [channel closing](close_session) when you're done with the channel
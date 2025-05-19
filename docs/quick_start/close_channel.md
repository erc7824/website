---
sidebar_position: 11
title: Close Channel
description: Properly shut down a state channel and settle the final state on-chain.
keywords: [erc7824, nitrolite, close channel, finalize, settlement, state channels]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Close Channel

Properly closing a state channel is crucial to ensure that all participants receive their rightful funds according to the latest agreed state. This guide explains how to safely close a channel through mutual agreement.

## Understanding Channel Closure

Closing a channel properly involves:

- Agreement on the final state by all participants
- Submitting the agreed state to the blockchain
- Transitioning from off-chain to on-chain settlement
- Preparing for fund withdrawal

## Prerequisites for Closing a Channel

Before closing a channel, ensure:

1. All application sessions within the channel are properly closed
2. All participants are ready to sign the final state
3. You have the latest state with all participants' signatures
4. Your client is connected and has access to your wallet

## Closing a Channel

To close a channel, you'll use the `createCloseChannelMessage` helper from NitroliteRPC and the `closeChannel` method of your client. Here's how to implement it in different frameworks:

<Tabs>
  <TabItem value="react" label="React">

```javascript
import { useCallback } from 'react';
import { createCloseChannelMessage } from '@erc7824/nitrolite';

// Hook for handling channel closing
export function useChannelClose() {
  // Clear channel data from local storage
  const clearStoredChannel = useCallback(() => {
    try {
      localStorage.removeItem('nitrolite_channel');
      localStorage.removeItem('nitrolite_channel_state');
      localStorage.removeItem('nitrolite_channel_id');
      console.log('Cleared channel data from storage');
    } catch (error) {
      console.error('Error clearing channel data:', error);
    }
  }, []);

  // Process the final state from ClearNode
  const handleCloseChannel = useCallback(async (finalState) => {
    try {
      // 1. Extract broker state
      const brokerState = finalState[0];

      // 2. Format final state data
      const finalStateData = {
        channelId: brokerState.channel_id,
        stateData: brokerState.state_data,
        version: brokerState.version,
        allocations: brokerState.allocations.map(alloc => ({
          destination: alloc.destination,
          token: alloc.token,
          amount: alloc.amount,
        })),
        serverSignature: brokerState.server_signature,
      };

      // 3. Submit close request to client
      await NitroliteStore.state.client.closeChannel({
        stateData: brokerState.state_data,
        finalState: finalStateData,
      });

      // 4. Clean up after successful closing
      clearStoredChannel();
      WalletStore.closeChannel();

      return true;
    } catch (error) {
      console.error('Error closing channel:', error);
      WalletStore.setChannelOpen(false);
      throw error;
    }
  }, [clearStoredChannel]);

  // Main function to close a channel
  const closeChannel = useCallback(async () => {
    // 1. Check prerequisites
    if (!isConnected || !walletAddress) {
      console.error('WebSocket not connected or wallet not connected');
      return;
    }

    setLoading(true);

    try {
      // 2. Get channel ID and verify signer
      const channelId = localStorage.getItem('nitrolite_channel_id');
      if (!channelId || !stateSigner) {
        throw new Error('Missing channel data or signer');
      }

      // 3. Create and send close message
      const closeMessage = await createCloseChannelMessage(
        stateSigner.sign,
        channelId,
        walletAddress  // funds destination
      );
      const response = await sendRequest(closeMessage);

      // 4. Process close response
      await handleCloseChannel(response);

      // 5. Update application state
      await refreshData();

      console.log('Channel closed successfully');
    } catch (error) {
      console.error('Error closing channel:', error);
    } finally {
      setLoading(false);
    }
  }, [isConnected, walletAddress, stateSigner, sendRequest, handleCloseChannel, refreshData]);

  return { closeChannel, handleCloseChannel, clearStoredChannel };
}
```

  </TabItem>
  <TabItem value="nodejs" label="Node.js">

```javascript
import { createCloseChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

/**
 * Close a channel with ClearNode assistance
 * @param {string} channelId - The channel ID
 * @param {WebSocket} ws - WebSocket connection to the ClearNode
 * @param {object} wallet - Ethers wallet for signing
 * @param {object} client - Nitrolite client
 * @returns {Promise<object>} Result with success status
 */
async function closeChannel(channelId, ws, wallet, client) {
  if (!channelId) throw new Error('Channel ID is required');
  
  try {
    console.log(`Closing channel ${channelId}`);
    
    // 1. Create message signer function
    const messageSigner = async (payload) => {
      const message = JSON.stringify(payload);
      const digestHex = ethers.id(message);
      const messageBytes = ethers.getBytes(digestHex);
      const { serialized: signature } = wallet.signingKey.sign(messageBytes);
      return signature;
    };
    
    // 2. Create and send close message
    const closeMessage = await createCloseChannelMessage(
      messageSigner,
      channelId,
      wallet.address // funds destination
    );
    
    // 3. Process response
    return await handleCloseResponse(ws, closeMessage, client);
  } catch (error) {
    console.error(`Error closing channel ${channelId}:`, error);
    throw error;
  }
}

/**
 * Handle WebSocket communication for channel closing
 */
function handleCloseResponse(ws, closeMessage, client) {
  return new Promise((resolve, reject) => {
    const handleResponse = (data) => {
      try {
        const rawData = typeof data === 'string' ? data : data.toString();
        const message = JSON.parse(rawData);
        
        // Success response
        if (message.res && message.res[1] === 'close_channel') {
          ws.removeListener('message', handleResponse);
          
          // Extract broker state
          const brokerState = message.res[2][0];
          
          // Format final state
          const finalState = {
            channelId: brokerState.channel_id,
            stateData: brokerState.state_data,
            version: brokerState.version,
            allocations: brokerState.allocations,
            serverSignature: brokerState.server_signature,
          };
          
          // Submit to client
          client.closeChannel({
            stateData: brokerState.state_data,
            finalState: finalState,
          })
          .then(() => {
            resolve({
              success: true,
              channelId: brokerState.channel_id
            });
          })
          .catch(error => {
            reject(new Error(`Close finalization failed: ${error.message}`));
          });
        }
        
        // Error response
        if (message.err) {
          ws.removeListener('message', handleResponse);
          reject(new Error(`Error ${message.err[1]}: ${message.err[2]}`));
        }
      } catch (error) {
        console.error('Error handling close response:', error);
      }
    };
    
    // Set up message handling
    ws.on('message', handleResponse);
    
    // Set timeout (15 seconds)
    setTimeout(() => {
      ws.removeListener('message', handleResponse);
      reject(new Error('Close timeout after 15 seconds'));
    }, 15000);
    
    // Send the message
    ws.send(closeMessage);
  });
}

// Usage example
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

closeChannel(channelId, ws, wallet, client)
  .then(result => console.log(`Channel ${result.channelId} closed successfully`))
  .catch(error => console.error('Close failed:', error));
```

  </TabItem>
  <TabItem value="angular" label="Angular">

```typescript
// channel-close.service.ts
import { Injectable } from '@angular/core';
import { createCloseChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { tap, catchError, switchMap, finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ChannelCloseService {
  private webSocket: WebSocket | null = null;
  private channelIdSubject = new BehaviorSubject<string | null>(null);
  
  public channelId$ = this.channelIdSubject.asObservable();
  
  constructor() {
    // Load channel ID from storage
    const storedChannelId = localStorage.getItem('nitrolite_channel_id');
    if (storedChannelId) this.channelIdSubject.next(storedChannelId);
  }
  
  public setWebSocket(ws: WebSocket): void {
    this.webSocket = ws;
  }
  
  /**
   * Clear channel data from storage
   */
  public clearChannelData(): void {
    localStorage.removeItem('nitrolite_channel');
    localStorage.removeItem('nitrolite_channel_state');
    localStorage.removeItem('nitrolite_channel_id');
    this.channelIdSubject.next(null);
  }
  
  /**
   * Main method to close a channel
   */
  public closeChannel(signer: any, client: any, channelId: string): Observable<any> {
    // 1. Validate prerequisites
    if (!this.webSocket) throw new Error('WebSocket not connected');
    if (!channelId) throw new Error('Channel ID required');
    
    // 2. Execute close flow using RxJS pipes
    return from(this.createCloseMessage(signer, channelId)).pipe(
      switchMap(message => this.sendCloseRequest(message)),
      switchMap(brokerState => this.processClose(client, brokerState)),
      tap(() => {
        console.log('Channel closed successfully');
        this.clearChannelData();
      }),
      catchError(error => {
        console.error('Close failed:', error);
        throw error;
      })
    );
  }
  
  /**
   * Create the signed close message
   */
  private async createCloseMessage(signer: any, channelId: string): Promise<string> {
    try {
      // Get user address and create message signer function
      const address = await signer.getAddress();
      const messageSigner = async (payload: any) => {
        const message = JSON.stringify(payload);
        const digestHex = ethers.id(message);
        const messageBytes = ethers.getBytes(digestHex);
        return await signer.signMessage(messageBytes);
      };
      
      // Create close message
      return await createCloseChannelMessage(messageSigner, channelId, address);
    } catch (error) {
      console.error('Error creating close message:', error);
      throw error;
    }
  }
  
  /**
   * Send close request to ClearNode via WebSocket
   */
  private sendCloseRequest(closeMessage: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.webSocket) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          // Success response
          if (message.res && message.res[1] === 'close_channel') {
            this.webSocket?.removeEventListener('message', handleMessage);
            resolve(message.res[2][0]); // Return broker state
          }
          
          // Error response
          if (message.err) {
            this.webSocket?.removeEventListener('message', handleMessage);
            reject(new Error(`Error: ${message.err[1]} - ${message.err[2]}`));
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      // Set up message handling with timeout
      this.webSocket.addEventListener('message', handleMessage);
      setTimeout(() => {
        this.webSocket?.removeEventListener('message', handleMessage);
        reject(new Error('Close timeout after 15 seconds'));
      }, 15000);
      
      // Send the message
      this.webSocket.send(closeMessage);
    });
  }
  
  /**
   * Process broker response and submit to client
   */
  private async processClose(client: any, brokerState: any): Promise<any> {
    // Format final state data from broker response
    const finalStateData = {
      channelId: brokerState.channel_id,
      stateData: brokerState.state_data,
      version: brokerState.version,
      allocations: brokerState.allocations.map((alloc: any) => ({
        destination: alloc.destination,
        token: alloc.token,
        amount: alloc.amount,
      })),
      serverSignature: brokerState.server_signature,
    };
    
    // Submit to client
    return await client.closeChannel({
      stateData: brokerState.state_data,
      finalState: finalStateData,
    });
  }
}

// channel-close.component.ts
import { Component, OnInit } from '@angular/core';
import { ChannelCloseService } from './channel-close.service';

@Component({
  selector: 'app-channel-close',
  template: `
    <div class="channel-container">
      <h3>Close Channel</h3>
      <div *ngIf="channelId" class="channel-info">
        <p>Channel ID: {{ channelId }}</p>
        <button (click)="closeChannel()" [disabled]="isClosing">
          {{ isClosing ? 'Closing...' : 'Close Channel' }}
        </button>
      </div>
      
      <div *ngIf="!channelId" class="info-message">No active channel found.</div>
      <div *ngIf="error" class="error-message">{{ error }}</div>
      <div *ngIf="success" class="success-message">Channel closed successfully!</div>
    </div>
  `,
  styles: [`
    .channel-container { margin: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px; }
    .channel-info { margin-bottom: 15px; }
    .error-message { color: red; margin-top: 10px; }
    .success-message { color: green; margin-top: 10px; }
    .info-message { color: blue; margin-top: 10px; }
  `]
})
export class ChannelCloseComponent implements OnInit {
  channelId: string | null = null;
  isClosing = false;
  error: string | null = null;
  success = false;
  
  constructor(
    private closeService: ChannelCloseService,
    private nitroliteClient: any
  ) {}
  
  ngOnInit(): void {
    // Subscribe to channel ID changes
    this.closeService.channelId$.subscribe(id => {
      this.channelId = id;
      this.success = false;
    });
    
    // Initialize WebSocket
    this.initWebSocket();
  }
  
  private initWebSocket(): void {
    const ws = new WebSocket('wss://your-clearnode-endpoint');
    ws.onopen = () => this.closeService.setWebSocket(ws);
  }
  
  closeChannel(): void {
    if (!this.channelId) {
      this.error = 'No active channel';
      return;
    }
    
    this.isClosing = true;
    this.error = null;
    this.success = false;
    
    // Get signer from wallet provider
    const provider = window.ethereum && new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider?.getSigner();
    
    if (!signer) {
      this.error = 'No wallet connected';
      this.isClosing = false;
      return;
    }
    
    // Execute close
    this.closeService.closeChannel(signer, this.nitroliteClient, this.channelId)
      .subscribe({
        next: () => {
          this.success = true;
          this.isClosing = false;
        },
        error: (err) => {
          this.error = `Close failed: ${err.message}`;
          this.isClosing = false;
        }
      });
  }
}
```

  </TabItem>
  <TabItem value="vue" label="Vue.js">

```javascript
<!-- ChannelClose.vue -->
<template>
  <div class="channel-close">
    <h3>Close Channel</h3>
    
    <div v-if="channelId" class="active-channel">
      <p>Channel ID: {{ channelId }}</p>
      <button @click="closeChannel" :disabled="isClosing || !isConnected">
        {{ isClosing ? 'Closing Channel...' : 'Close Channel' }}
      </button>
    </div>
    
    <div v-else class="no-channel">No active channel found.</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="success" class="success-message">Channel closed successfully!</div>
    <div v-if="!isConnected" class="warning-message">WebSocket not connected</div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { createCloseChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

export default defineComponent({
  name: 'ChannelClose',
  
  setup() {
    // State references
    const channelId = ref(localStorage.getItem('nitrolite_channel_id') || null);
    const isClosing = ref(false);
    const error = ref(null);
    const success = ref(false);
    const isConnected = ref(false);
    let webSocket = null;
    
    // Lifecycle hooks
    onMounted(() => {
      initWebSocket();
    });
    
    onUnmounted(() => {
      if (webSocket) webSocket.close();
    });
    
    // Clear channel data from storage
    const clearChannelData = () => {
      localStorage.removeItem('nitrolite_channel');
      localStorage.removeItem('nitrolite_channel_state');
      localStorage.removeItem('nitrolite_channel_id');
      channelId.value = null;
    };
    
    // Initialize WebSocket connection
    const initWebSocket = () => {
      webSocket = new WebSocket('wss://your-clearnode-endpoint');
      webSocket.onopen = () => isConnected.value = true;
      webSocket.onclose = () => isConnected.value = false;
      webSocket.onerror = () => {
        isConnected.value = false;
        error.value = 'WebSocket connection error';
      };
    };
    
    // Main close function
    const closeChannel = async () => {
      // 1. Validate prerequisites
      if (!isConnected.value || !webSocket) {
        error.value = 'WebSocket not connected';
        return;
      }
      
      if (!channelId.value) {
        error.value = 'No channel ID found';
        return;
      }
      
      try {
        // 2. Set up UI state
        isClosing.value = true;
        error.value = null;
        success.value = false;
        
        // 3. Get wallet signer
        if (!window.ethereum) throw new Error('No Ethereum provider');
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        // 4. Create message signer function
        const messageSigner = async (payload) => {
          const message = JSON.stringify(payload);
          const digestHex = ethers.id(message);
          return await signer.signMessage(ethers.getBytes(digestHex));
        };
        
        // 5. Create and send close message
        const closeMessage = await createCloseChannelMessage(
          messageSigner,
          channelId.value,
          address // funds destination
        );
        const brokerState = await sendWebSocketRequest(closeMessage);
        
        // 6. Format final state and submit to client
        const finalStateData = {
          channelId: brokerState.channel_id,
          stateData: brokerState.state_data,
          version: brokerState.version,
          allocations: brokerState.allocations.map(alloc => ({
            destination: alloc.destination,
            token: alloc.token,
            amount: alloc.amount,
          })),
          serverSignature: brokerState.server_signature,
        };
        
        await window.nitroliteClient.closeChannel({
          stateData: brokerState.state_data,
          finalState: finalStateData,
        });
        
        // 7. Update state after success
        success.value = true;
        clearChannelData();
        
      } catch (err) {
        error.value = err.message || 'Close failed';
        console.error('Close error:', err);
      } finally {
        isClosing.value = false;
      }
    };
    
    // Send WebSocket request and handle response
    const sendWebSocketRequest = (payload) => {
      return new Promise((resolve, reject) => {
        const handleMessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Success response
            if (message.res && message.res[1] === 'close_channel') {
              webSocket.removeEventListener('message', handleMessage);
              resolve(message.res[2][0]); // Broker state
            }
            
            // Error response
            if (message.err) {
              webSocket.removeEventListener('message', handleMessage);
              reject(new Error(`${message.err[1]}: ${message.err[2]}`));
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
        
        // Setup listener with timeout
        webSocket.addEventListener('message', handleMessage);
        setTimeout(() => {
          webSocket.removeEventListener('message', handleMessage);
          reject(new Error('Close timeout'));
        }, 15000);
        
        webSocket.send(payload);
      });
    };
    
    return { 
      channelId, 
      isClosing, 
      error, 
      success, 
      isConnected, 
      closeChannel 
    };
  }
});
</script>

<style scoped>
.channel-close {
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 20px;
}
.active-channel {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}
.error-message { color: #d32f2f; margin-top: 10px; }
.success-message { color: #388e3c; margin-top: 10px; }
.warning-message { color: #f57c00; margin-top: 10px; }
button {
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled { background-color: #bbdefb; cursor: not-allowed; }
</style>
```

  </TabItem>
</Tabs>

## Understanding Channel Closing Flow

When closing a channel with a ClearNode, the process involves these key steps:

1. **Creating a close request** using `createCloseChannelMessage` with the channel ID and funds destination
2. **Sending the close request** to the ClearNode via WebSocket
3. **Receiving final state** from the ClearNode with allocation information
4. **Processing the close** by calling the client's `closeChannel` method with the final state
5. **Cleaning up resources** by removing channel data from storage

## The Close Message Structure

The close channel message requires:

| Parameter | Description | Example |
|-----------|-------------|--------|
| `channelId` | Identifier for the channel to close | `"0x1234567890abcdef..."` |
| `fundDestination` | Address where remaining funds should go | `"0xUserAddress..."` |

## Broker Response Structure

The ClearNode's response contains a final state that includes:

| Component | Description | Example |
|-----------|-------------|--------|
| `channel_id` | Identifier for the channel | `"0x1234567890abcdef..."` |
| `state_data` | Encoded state data | `"0x000000..."` |
| `version` | Final state version number | `1` |
| `allocations` | Final token allocations | `[{destination, token, amount}]` |
| `server_signature` | Broker's signature | `{v, r, s}` values |

## Next Steps

After closing a channel, you should:

1. [Withdraw your funds](withdrawal) from the custody contract
2. [Set up a new channel](deposit_and_create_channel) if you want to continue transacting with the counterparty

## Closure Best Practices

- Always close all application sessions before closing the channel
- Ensure you have the latest agreed state with all signatures
- Back up the signed final state for your records
- Wait for sufficient block confirmations before considering the channel fully closed
- Verify the on-chain settlement matches your expected final balances
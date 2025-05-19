---
sidebar_position: 9
title: Resize Channel
description: Adjust the funds locked in a channel to accommodate changing transaction requirements.
keywords: [erc7824, nitrolite, resize channel, funding, state channels]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Resize Channel

Resizing a channel allows you to adjust the funds allocated to it without closing and reopening the channel. This guide explains how to safely increase or decrease channel capacity.

## Why Resize a Channel?

You might need to resize a channel for several reasons:

- **Add more funds** when the channel is running low
- **Reduce allocated funds** when they're no longer needed
- **Adjust allocations** between participants
- **Work with broker/ClearNode** to ensure proper channel operation
- **Prepare for channel closure** by ensuring sufficient funds

## Channel Resize Methods

Nitrolite supports three primary methods for resizing a channel:

1. **Fund Addition**: Adding more funds to the channel
2. **Fund Removal**: Taking some funds out (partial withdrawal)
3. **Broker-Assisted Resize**: Working with a ClearNode to resize the channel when the broker needs to adjust its funds for closing

## Performing a Channel Resize

To resize a channel, you'll use the `createResizeChannelMessage` helper from NitroliteRPC and the `resizeChannel` method of your client. The `createResizeChannelMessage` function accepts a message signing function and an array of resize parameters. Here's how to implement it in different frameworks:

<Tabs>
  <TabItem value="react" label="React">

```javascript
import { useCallback } from 'react';
import { createResizeChannelMessage } from '@erc7824/nitrolite';

// Hook for handling channel resizing
export function useResize() {
  // Function to submit resize request to the NitroliteClient
  const handleResizeChannel = useCallback(async (resizeState, originalState) => {
    try {
      // Call client's resizeChannel with new state and proof of original state
      await NitroliteStore.state.client.resizeChannel({
        resizeState: resizeState,
        proofStates: [originalState],
      });
      return true;
    } catch (error) {
      console.error('Error resizing channel:', error);
      throw error;
    }
  }, []);

  return { handleResizeChannel };
}

// Hook implementing the resize flow
function useChannelResize() {
  const { handleResizeChannel } = useResize();
  
  const resizeChannel = useCallback(async () => {
    // Prerequisites check
    if (!isConnected || !walletAddress) {
      console.error('WebSocket not connected or wallet not connected');
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Retrieve channel data
      const channelId = localStorage.getItem('nitrolite_channel_id');
      const stateJson = localStorage.getItem('nitrolite_channel_state');
      
      if (!channelId || !stateJson || !stateSigner) {
        throw new Error('Missing channel data or signer');
      }
      
      // 2. Parse the stored channel state (handling BigInt conversion)
      const originalState = JSON.parse(stateJson, (key, value) => {
        return typeof value === 'string' && /^\d+n$/.test(value)
          ? BigInt(value.slice(0, -1))
          : value;
      });
      
      // 3. Create resize parameters for a deposit operation
      // Note: You can only use either allocate_amount OR resize_amount (not both)
      const resizeParams = [{
        channel_id: channelId,
        funds_destination: walletAddress,
        resize_amount: 50      // Deposit 50 tokens to this channel
      }];
      
      // 4. Create and send resize message to ClearNode
      const resizeMessage = await createResizeChannelMessage(
        stateSigner.sign, 
        resizeParams
      );
      const response = await sendRequest(resizeMessage);
      
      // 5. Process broker response
      const brokerState = response[0];
      const resizeState = {
        channelId: brokerState.channel_id,
        stateData: brokerState.state_data,
        version: brokerState.version,
        intent: brokerState.intent,
        allocations: brokerState.allocations.map(alloc => ({
          destination: allocation.destination,
          token: allocation.token,
          amount: allocation.amount,
        })),
        serverSignature: brokerState.server_signature,
      };
      
      // 6. Submit resize to client
      await handleResizeChannel(resizeState, originalState);
      
      // 7. Update app state after successful resize
      await refreshChannelData();
      
    } catch (error) {
      console.error('Resize failed:', error);
    } finally {
      setLoading(false);
    }
  }, [isConnected, walletAddress, stateSigner]);
  
  return { resizeChannel };
}
```

  </TabItem>
  <TabItem value="nodejs" label="Node.js">

```javascript
import { createResizeChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

/**
 * Resize a channel with ClearNode assistance
 * @param {string} channelId - The channel ID
 * @param {WebSocket} ws - WebSocket connection to the ClearNode
 * @param {object} wallet - Ethers wallet for signing
 * @param {object} channelState - Current channel state
 * @returns {Promise<object>} Result with success status and channel ID
 */
async function resizeChannel(channelId, ws, wallet, channelState, client) {
  if (!channelId) throw new Error('Channel ID is required');
  
  try {
    // 1. Create message signer function
    const messageSigner = async (payload) => {
      const message = JSON.stringify(payload);
      const digestHex = ethers.id(message);
      const messageBytes = ethers.getBytes(digestHex);
      const { serialized: signature } = wallet.signingKey.sign(messageBytes);
      return signature;
    };
    
    // 2. Create resize parameters for a deposit operation
    // Note: You can only use either allocate_amount OR resize_amount (not both)
    const resizeParams = [{
      channel_id: channelId,
      funds_destination: wallet.address,
      resize_amount: 50      // Deposit 50 tokens to this channel
    }];
    
    // 3. Create and send the resize message
    const resizeMessage = await createResizeChannelMessage(messageSigner, resizeParams);
    
    // 4. Process the response
    return await handleWebSocketResponse(ws, resizeMessage, channelState, client);
  } catch (error) {
    console.error(`Error resizing channel ${channelId}:`, error);
    throw error;
  }
}

/**
 * Handle WebSocket communication for channel resize
 */
function handleWebSocketResponse(ws, resizeMessage, channelState, client) {
  return new Promise((resolve, reject) => {
    const handleResizeResponse = (data) => {
      try {
        const rawData = typeof data === 'string' ? data : data.toString();
        const message = JSON.parse(rawData);
        
        // Success response
        if (message.res && message.res[1] === 'resize_channel') {
          ws.removeListener('message', handleResizeResponse);
          
          // Extract and format broker state
          const brokerState = message.res[2][0];
          const resizeState = {
            channelId: brokerState.channel_id,
            stateData: brokerState.state_data,
            version: brokerState.version,
            intent: brokerState.intent,
            allocations: brokerState.allocations,
            serverSignature: brokerState.server_signature,
          };
          
          // Submit to client
          client.resizeChannel({
            resizeState: resizeState,
            proofStates: [channelState],
          })
          .then(() => {
            resolve({
              success: true,
              channelId: brokerState.channel_id
            });
          })
          .catch(error => {
            reject(new Error(`Resize completion failed: ${error.message}`));
          });
        }
        
        // Error response
        if (message.err) {
          ws.removeListener('message', handleResizeResponse);
          reject(new Error(`Error ${message.err[1]}: ${message.err[2]}`));
        }
      } catch (error) {
        console.error('Error handling resize response:', error);
      }
    };
    
    // Set up message handling
    ws.on('message', handleResizeResponse);
    
    // Set timeout (15 seconds)
    setTimeout(() => {
      ws.removeListener('message', handleResizeResponse);
      reject(new Error('Resize timeout after 15 seconds'));
    }, 15000);
    
    // Send the message
    ws.send(resizeMessage);
  });
}

// Usage example
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const channelState = loadChannelState(channelId);

resizeChannel(channelId, ws, wallet, channelState, client)
  .then(result => console.log(`Channel ${result.channelId} resized successfully`))
  .catch(error => console.error('Resize failed:', error));
```

  </TabItem>
  <TabItem value="angular" label="Angular">

```typescript
// channel-resize.service.ts
import { Injectable } from '@angular/core';
import { createResizeChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ChannelResizeService {
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
   * Main method to resize a channel
   */
  public resizeChannel(signer: any, client: any, channelId: string): Observable<any> {
    // 1. Validate prerequisites
    if (!this.webSocket) throw new Error('WebSocket not connected');
    if (!channelId) throw new Error('Channel ID required');
    
    // 2. Load channel state
    const stateJson = localStorage.getItem('nitrolite_channel_state');
    if (!stateJson) throw new Error('No channel state found');
    const channelState = JSON.parse(stateJson);
    
    // 3. Execute resize flow using RxJS pipes
    return from(this.createResizeMessage(signer, channelId)).pipe(
      switchMap(message => this.sendResizeRequest(message)),
      switchMap(brokerState => this.processResize(client, brokerState, channelState)),
      tap(() => console.log('Channel resized successfully')),
      catchError(error => {
        console.error('Resize failed:', error);
        throw error;
      })
    );
  }
  
  /**
   * Create the signed resize message
   */
  private async createResizeMessage(signer: any, channelId: string): Promise<string> {
    try {
      // Get user address and create message signer function
      const address = await signer.getAddress();
      const messageSigner = async (payload: any) => {
        const message = JSON.stringify(payload);
        const digestHex = ethers.id(message);
        const messageBytes = ethers.getBytes(digestHex);
        return await signer.signMessage(messageBytes);
      };
      
      // Create resize parameters for a deposit operation
      // Note: You can only use either allocate_amount OR resize_amount (not both)
      const resizeParams = [{
        channel_id: channelId,
        funds_destination: address,
        resize_amount: 50      // Deposit 50 tokens to this channel
      }];
      
      return await createResizeChannelMessage(messageSigner, resizeParams);
    } catch (error) {
      console.error('Error creating resize message:', error);
      throw error;
    }
  }
  
  /**
   * Send resize request to ClearNode via WebSocket
   */
  private sendResizeRequest(resizeMessage: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.webSocket) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          // Success response
          if (message.res && message.res[1] === 'resize_channel') {
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
        reject(new Error('Resize timeout after 15 seconds'));
      }, 15000);
      
      // Send the message
      this.webSocket.send(resizeMessage);
    });
  }
  
  /**
   * Process broker response and submit to client
   */
  private async processResize(client: any, brokerState: any, channelState: any): Promise<any> {
    // Format resize state data from broker response
    const resizeStateData = {
      channelId: brokerState.channel_id,
      stateData: brokerState.state_data,
      version: brokerState.version,
      intent: brokerState.intent,
      allocations: brokerState.allocations.map((alloc: any) => ({
        destination: allocation.destination,
        token: allocation.token,
        amount: allocation.amount,
      })),
      serverSignature: brokerState.server_signature,
    };
    
    // Submit to client
    return await client.resizeChannel({
      resizeState: resizeStateData,
      proofStates: [channelState],
    });
  }
}

// channel-resize.component.ts
import { Component, OnInit } from '@angular/core';
import { ChannelResizeService } from './channel-resize.service';

@Component({
  selector: 'app-channel-resize',
  template: `
    <div class="channel-container">
      <h3>Resize Channel</h3>
      <div *ngIf="channelId" class="channel-info">
        <p>Channel ID: {{ channelId }}</p>
        <button (click)="resizeChannel()" [disabled]="isResizing">
          {{ isResizing ? 'Resizing...' : 'Resize Channel' }}
        </button>
      </div>
      
      <div *ngIf="!channelId" class="info-message">No active channel found.</div>
      <div *ngIf="error" class="error-message">{{ error }}</div>
      <div *ngIf="success" class="success-message">Channel resized successfully!</div>
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
export class ChannelResizeComponent implements OnInit {
  channelId: string | null = null;
  isResizing = false;
  error: string | null = null;
  success = false;
  
  constructor(
    private resizeService: ChannelResizeService,
    private nitroliteClient: any
  ) {}
  
  ngOnInit(): void {
    // Subscribe to channel ID changes
    this.resizeService.channelId$.subscribe(id => {
      this.channelId = id;
      this.success = false;
    });
    
    // Initialize WebSocket
    this.initWebSocket();
  }
  
  private initWebSocket(): void {
    const ws = new WebSocket('wss://your-clearnode-endpoint');
    ws.onopen = () => this.resizeService.setWebSocket(ws);
  }
  
  resizeChannel(): void {
    if (!this.channelId) {
      this.error = 'No active channel';
      return;
    }
    
    this.isResizing = true;
    this.error = null;
    this.success = false;
    
    // Get signer from wallet provider
    const provider = window.ethereum && new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider?.getSigner();
    
    if (!signer) {
      this.error = 'No wallet connected';
      this.isResizing = false;
      return;
    }
    
    // Execute resize
    this.resizeService.resizeChannel(signer, this.nitroliteClient, this.channelId)
      .subscribe({
        next: () => {
          this.success = true;
          this.isResizing = false;
        },
        error: (err) => {
          this.error = `Resize failed: ${err.message}`;
          this.isResizing = false;
        }
      });
  }
}
```

  </TabItem>
  <TabItem value="vue" label="Vue.js">

```javascript
<!-- ChannelResize.vue -->
<template>
  <div class="channel-resize">
    <h3>Resize Channel</h3>
    
    <div v-if="channelId" class="active-channel">
      <p>Channel ID: {{ channelId }}</p>
      <button @click="resizeChannel" :disabled="isResizing || !isConnected">
        {{ isResizing ? 'Resizing Channel...' : 'Resize Channel' }}
      </button>
    </div>
    
    <div v-else class="no-channel">No active channel found.</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="success" class="success-message">Channel resized successfully!</div>
    <div v-if="!isConnected" class="warning-message">WebSocket not connected</div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { createResizeChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

export default defineComponent({
  name: 'ChannelResize',
  
  setup() {
    // State references
    const channelId = ref(localStorage.getItem('nitrolite_channel_id') || null);
    const channelState = ref(null);
    const isResizing = ref(false);
    const error = ref(null);
    const success = ref(false);
    const isConnected = ref(false);
    let webSocket = null;
    
    // Lifecycle hooks
    onMounted(() => {
      loadChannelState();
      initWebSocket();
    });
    
    onUnmounted(() => {
      if (webSocket) webSocket.close();
    });
    
    // Load channel state from storage
    const loadChannelState = () => {
      const storedState = localStorage.getItem('nitrolite_channel_state');
      if (!storedState) return;
      
      try {
        // Parse JSON with BigInt support
        channelState.value = JSON.parse(storedState, (key, value) => {
          return typeof value === 'string' && /^\d+n$/.test(value)
            ? BigInt(value.slice(0, -1))
            : value;
        });
      } catch (err) {
        console.error('Error parsing channel state:', err);
      }
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
    
    // Main resize function
    const resizeChannel = async () => {
      // 1. Validate prerequisites
      if (!isConnected.value || !webSocket) {
        error.value = 'WebSocket not connected';
        return;
      }
      
      if (!channelId.value || !channelState.value) {
        error.value = 'Missing channel data';
        return;
      }
      
      try {
        // 2. Set up UI state
        isResizing.value = true;
        error.value = null;
        success.value = false;
        
        // 3. Get wallet signer
        if (!window.ethereum) throw new Error('No Ethereum provider');
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        // 4. Create message signer and resize parameters
        const messageSigner = async (payload) => {
          const message = JSON.stringify(payload);
          const digestHex = ethers.id(message);
          return await signer.signMessage(ethers.getBytes(digestHex));
        };
        
        // Create resize parameters for a deposit operation
        // Note: You can only use either allocate_amount OR resize_amount (not both)
        const resizeParams = [{
          channel_id: channelId.value,
          funds_destination: address,
          resize_amount: 50      // Deposit 50 tokens to this channel
        }];
        
        // 5. Create and send resize message
        const resizeMessage = await createResizeChannelMessage(messageSigner, resizeParams);
        const brokerState = await sendWebSocketRequest(resizeMessage);
        
        // 6. Format and submit resize state
        const resizeStateData = {
          channelId: brokerState.channel_id,
          stateData: brokerState.state_data,
          version: brokerState.version,
          intent: brokerState.intent,
          allocations: brokerState.allocations.map(alloc => ({
            destination: allocation.destination,
            token: allocation.token,
            amount: allocation.amount,
          })),
          serverSignature: brokerState.server_signature,
        };
        
        await window.nitroliteClient.resizeChannel({
          resizeState: resizeStateData,
          proofStates: [channelState.value],
        });
        
        // 7. Update state after success
        success.value = true;
        await refreshChannelState();
        
      } catch (err) {
        error.value = err.message || 'Resize failed';
        console.error('Resize error:', err);
      } finally {
        isResizing.value = false;
      }
    };
    
    // Send WebSocket request and handle response
    const sendWebSocketRequest = (payload) => {
      return new Promise((resolve, reject) => {
        const handleMessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Success response
            if (message.res && message.res[1] === 'resize_channel') {
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
          reject(new Error('Resize timeout'));
        }, 15000);
        
        webSocket.send(payload);
      });
    };
    
    // Update channel state after resize
    const refreshChannelState = async () => {
      try {
        // Get updated state from client
        const newState = await window.nitroliteClient.getChannelState(channelId.value);
        
        // Store with BigInt serialization
        localStorage.setItem('nitrolite_channel_state', 
          JSON.stringify(newState, (key, value) => {
            return typeof value === 'bigint' ? value.toString() + 'n' : value;
          })
        );
        
        channelState.value = newState;
      } catch (err) {
        console.error('Error refreshing state:', err);
      }
    };
    
    return { channelId, isResizing, error, success, isConnected, resizeChannel };
  }
});
</script>

<style scoped>
.channel-resize {
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

## Understanding Broker-Assisted Resize

When resizing a channel with a ClearNode or broker, the process involves:

1. **Creating a resize request** using `createResizeChannelMessage` with appropriate parameters
2. **Sending the resize request** to the ClearNode via WebSocket
3. **Receiving broker state** from the ClearNode with new state information
4. **Processing the resize** by calling the client's `resizeChannel` method with both:
   - The new broker state (resizeState)
   - The original channel state (proofStates)

This flow is particularly important when:
- The broker needs to adjust its funds for closing a channel
- Channel capacity needs to be adjusted while keeping operations active
- A recovery or correction is needed for channel state

## The Resize Message Structure

The `createResizeChannelMessage` function takes two parameters:

1. `messageSigner`: A function that takes a payload and returns a signature
2. `resizeParams`: An array of resize operation objects

Each resize operation object in the array includes:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `channel_id` | Identifier for the channel to resize | `"0x1234567890abcdef..."` |
| `funds_destination` | Address where funds would go | `"0xUserAddress..."` |
| `allocate_amount` | Amount of tokens to allocate to this specific channel from unified balance | `80` (allocate 80 tokens from unified balance) |
| `resize_amount` | Amount to deposit (positive) or withdraw (negative) from the channel | `75` (deposit 75 tokens) or `-100` (withdraw 100 tokens) |

## Broker Response Structure

The ClearNode's response contains a new state that includes:

| Component | Description | Example |
|-----------|-------------|---------|
| `channel_id` | Identifier for the channel | `"0x1234567890abcdef..."` |
| `state_data` | Encoded state data | `"0x000000..."` |
| `intent` | Purpose code for this state | `2` |
| `version` | State version number | `1` |
| `allocations` | Array of token allocations | `[{destination, token, amount}]` |
| `state_hash` | Hash of the state | `"0x61cec3..."` |
| `server_signature` | Broker's signature | `{v, r, s}` values |

## Understanding Allocation and Resize Amounts

When working with Nitrolite channels across different networks, it's important to understand how to use `allocate_amount` and `resize_amount`:

- **`allocate_amount`**: Controls how much of your unified token balance is allocated to a specific channel on a specific network.
- **`resize_amount`**: Controls how much you want to deposit to or withdraw from a specific channel.

**IMPORTANT**: In a single resize operation, you can only use either `allocate_amount` OR `resize_amount`, not both at the same time. Only include the parameter you're using.

### Allocation and Resize Examples

**Example 1: Depositing to a Channel**

Initial state:
- User has channels on Polygon (20 USDC) and Celo (5 USDC)
- Total unified balance: 25 USDC

To deposit 75 USDC to Celo channel:
```javascript
const resizeParams = [{
  channel_id: "0xCeloChannelId...",
  funds_destination: userAddress,
  resize_amount: 75        // Deposit 75 USDC
}];
```

Result:
- Polygon channel: 20 USDC
- Celo channel: 80 USDC
- Total unified balance: 100 USDC

**Example 2: Withdrawing All Funds to a Specific Network**

Initial state (after Example 1):
- Polygon channel: 20 USDC
- Celo channel: 80 USDC
- Total unified balance: 100 USDC

To withdraw all 100 USDC to Polygon:
```javascript
// Step 1: First allocate funds from Celo to Polygon
const allocateParams = [{
  channel_id: "0xPolygonChannelId...",
  funds_destination: userAddress,
  allocate_amount: 80     // Allocate 80 USDC from Celo to Polygon
}];

// Step 2: Then withdraw from Polygon
const withdrawParams = [{
  channel_id: "0xPolygonChannelId...",
  funds_destination: userAddress,
  resize_amount: -100      // Withdraw 100 USDC
}];

// For deallocating from Celo when needed:
const deallocateParams = [{
  channel_id: "0xCeloChannelId...",
  funds_destination: userAddress,
  allocate_amount: -80    // Deallocate all funds from Celo
}];
```

Result:
- All 100 USDC withdrawn to user's wallet on Polygon
- Channels may remain open with zero balance

## Common Use Cases for Channel Resize

| Scenario | Description | Implementation Details |
|----------|-------------|------------------------|
| **Pre-closure Preparation** | Ensuring broker has sufficient funds to close the channel | Use resize before closure to adjust broker funds |
| **Adding Capacity** | Increasing channel capacity for continued operations | Add funds to the channel with appropriate allocations |
| **Balance Adjustment** | Adjusting balances between participants | Resize with new allocation values |
| **Cross-Network Transfers** | Moving funds between channels on different networks | Use allocation to move funds between networks |
| **Withdrawals** | Withdrawing funds from the system | Allocate funds to target network, then use negative resize_amount |
| **Recovery** | Recovering from an inconsistent state | Work with broker to establish correct state |

## Best Practices

When resizing channels, follow these best practices:

1. **Always store channel states** so they're available when needed for resize operations
2. **Validate broker responses** by checking signatures and parameters
3. **Implement proper error handling** for timeout and connection issues
4. **Clean up event listeners** to prevent memory leaks
5. **Provide clear user feedback** during the resize process
6. **Use allocate_amount OR resize_amount (not both)** in a single operation:
   - To deposit: Use only `resize_amount: [positive amount]`
   - To withdraw: First allocate funds to the target channel (in a separate operation), then use negative resize_amount
   - To transfer between networks: Use only allocation `allocate_amount: [amount]`
7. **When withdrawing all funds**, consider deallocating from other channels

## Common Allocation and Resize Scenarios

Remember: You can only use either `allocate_amount` OR `resize_amount` in a single operation, not both.

| Action | Parameter to Use | Value | Example |
|--------|-----------------|-------|---------|
| **Simple deposit** | resize_amount | Positive amount | `resize_amount: 50` |
| **Simple withdrawal** | resize_amount | Negative amount | `resize_amount: -30` |
| **Cross-network allocation** | allocate_amount | Positive amount | `allocate_amount: 75` |
| **Deallocate** | allocate_amount | Negative amount | `allocate_amount: -40` |
| **Withdraw from multiple channels** | Two separate operations | Operation 1: allocate_amount (positive)<br/>Operation 2: resize_amount (negative) | Step 1: `allocate_amount: 80`<br/>Step 2: `resize_amount: -100` |

## Common Errors and Troubleshooting

| Error Type | Description | Solution |
|------------|-------------|----------|
| **Missing state** | No channel state is available | Ensure channel state is saved after creation and transactions |
| **Broker timeout** | ClearNode does not respond in time | Implement retry logic with exponential backoff |
| **Invalid signature** | Broker signature cannot be verified | Ensure proper cryptographic setup and validation |
| **State mismatch** | Channel state doesn't match broker expectations | Synchronize state with the broker before resize |

## Next Steps

After resizing your channel, you can:

1. [Continue with existing application sessions](application_session)
2. [Check your channel balances](balances) to verify the new allocation
3. [Close the channel](close_channel) if resize was in preparation for closing
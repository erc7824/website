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

To resize a channel, you'll use the `createResizeChannelMessage` helper from NitroliteRPC and the `resizeChannel` method of your client. Here's how to implement it in different frameworks:

<Tabs>
  <TabItem value="react" label="React">

```javascript
import { useCallback } from 'react';
import { createResizeChannelMessage } from '@erc7824/nitrolite';
import { Hex, Address } from 'viem';

// Hook for handling channel resizing
export function useResize() {
  // This function handles the actual resize operation with the provided states
  const handleResizeChannel = useCallback(async (finalState, initState) => {
    try {
      console.log('Using initial state proofs:', initState);

      // Call the client's resizeChannel method with the resize state and proof states
      await NitroliteStore.state.client.resizeChannel({
        resizeState: finalState,
        proofStates: [initState],
      });

      return true;
    } catch (error) {
      console.error('Error resizing channel:', error);
      throw error;
    }
  }, []);

  return {
    handleResizeChannel,
  };
}

// Component or hook implementing the resize flow
function useChannelResizeOperation() {
  const { handleResizeChannel } = useResize();
  
  // Main resize function that creates the resize message and processes the response
  const resizeChannel = useCallback(async () => {
    // Get current wallet and signer
    const signer = nitroSnap.stateSigner;
    
    if (!isConnected || !walletSnap.walletAddress) {
      console.error('WebSocket not connected or wallet not connected');
      return;
    }
    
    setLoading((prev) => ({ ...prev, resize: true }));
    
    try {
      // Get channel information from local storage
      const channelId = localStorage.getItem('nitrolite_channel_id') || '';
      const state = localStorage.getItem('nitrolite_channel_state') || '';
      
      if (!state) {
        throw new Error('No channel state found. Please create a channel first.');
      }
      
      if (!channelId) {
        throw new Error('No channel ID found. Please create a channel first.');
      }
      
      if (!nitroSnap.stateSigner) {
        throw new Error('State signer not initialized. Please create a channel first.');
      }
      
      // Define destination for funds (usually your address)
      const fundDestination = walletSnap.walletAddress;
      
      // Parse the saved channel state
      const parsedState = JSON.parse(state, (key, value) => {
        // Convert strings that look like BigInts back to BigInt
        if (typeof value === 'string' && /^\d+n$/.test(value)) {
          return BigInt(value.substring(0, value.length - 1));
        }
        return value;
      });
      
      // Validate the parsed state
      if (!parsedState || !parsedState.allocations || parsedState.allocations.length === 0) {
        throw new Error('Invalid channel state. No allocations found.');
      }
      
      if (!nitroSnap.userAccountFromParticipants) {
        throw new Error('User account not found in participants.');
      }
      
      console.log('Current allocations:', parsedState.allocations[0]);
      
      // Create resize parameters
      // participant_change: 0 keeps the same participants
      // A negative value would change participants
      const resizeParams = [
        {
          channel_id: channelId,
          participant_change: 0,
          funds_destination: fundDestination,
        },
      ];
      
      // Create the resize message
      const resizeMessage = await createResizeChannelMessage(signer.sign, resizeParams);
      
      // Send the resize message to the ClearNode
      const response = await sendRequest(resizeMessage);
      
      // Example response from ClearNode:
      // {
      //   "channel_id": "0x5e9f1bf4f970d3d6f2c30b62c6fb3650ef48a8f170ca2020fb4858ee10f5b377",
      //   "state_data": "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec780000000000000000000000000000000000000000000000000000000000000000",
      //   "intent": 2,
      //   "version": 1,
      //   "allocations": [
      //     {
      //       "destination": "0x47b56a639D1Dbe3eDfb3c34b1BB583Bf4312be97",
      //       "token": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      //       "amount": 0
      //     },
      //     {
      //       "destination": "0x3c93C321634a80FB3657CFAC707718A11cA57cBf",
      //       "token": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      //       "amount": 0
      //     }
      //   ],
      //   "state_hash": "0x61cec33449997e8478ae9d3cff96dc33eb7547ce35e2b5b634c4a567d50a8972",
      //   "server_signature": {
      //     "v": "28",
      //     "r": "\"0xb36160607133e8fcb7e85698a9d87836a41e2a6324b4be5edc66b4de4d990897\"",
      //     "s": "\"0x5770fd47cd6f7da77d8a24f9dc0b9732dedf635b776ff1037d616e25f16580a7\""
      //   }
      // }
      
      // Extract broker state from response
      const brokerState = response[0];
      
      // Format the resize state data
      const resizeStateData = {
        channelId: brokerState.channel_id,
        stateData: brokerState.state_data,
        version: brokerState.version,
        intent: brokerState.intent,
        allocations: [
          {
            destination: brokerState.allocations[0].destination,
            token: brokerState.allocations[0].token,
            amount: brokerState.allocations[0].amount,
          },
          {
            destination: brokerState.allocations[1].destination,
            token: brokerState.allocations[1].token,
            amount: brokerState.allocations[1].amount,
          },
        ],
        serverSignature: brokerState['server_signature'],
      };
      
      // Call the resize function with the new state and original state
      await handleResizeChannel(resizeStateData, parsedState);
      
      // Update account info after resize
      await Promise.all([getAccountInfo(), getParticipants()]);
      
      console.log('Channel resized successfully');
    } catch (error) {
      console.error('Error resizing channel:', error);
    } finally {
      setLoading((prev) => ({ ...prev, resize: false }));
    }
  }, [isConnected, walletSnap.walletAddress, sendRequest, handleResizeChannel, getAccountInfo, getParticipants]);
  
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
 * @returns {Promise<boolean>} Success status
 */
async function resizeChannel(channelId, ws, wallet, channelState) {
  try {
    console.log(`Resizing channel ${channelId}`);
    
    if (!channelId) {
      throw new Error('Channel ID is required');
    }
    
    // Message signer function
    const messageSigner = async (payload) => {
      try {
        const message = JSON.stringify(payload);
        const digestHex = ethers.id(message);
        const messageBytes = ethers.getBytes(digestHex);
        const { serialized: signature } = wallet.signingKey.sign(messageBytes);
        return signature;
      } catch (error) {
        console.error("Error signing message:", error);
        throw error;
      }
    };
    
    // Define the destination for funds (typically your address)
    const fundDestination = wallet.address;
    
    // Create resize parameters
    const resizeParams = [
      {
        channel_id: channelId,
        participant_change: 0, // 0 means no change in participants
        funds_destination: fundDestination,
      },
    ];
    
    // Create the resize message
    const resizeMessage = await createResizeChannelMessage(messageSigner, resizeParams);
    
    // Send the message and wait for response
    return new Promise((resolve, reject) => {
      // Create a one-time message handler for the resize response
      const handleResizeResponse = (data) => {
        try {
          const rawData = typeof data === 'string' ? data : data.toString();
          const message = JSON.parse(rawData);
          
          console.log('Received resize response:', message);
          
          // Check if this is a resize response
          if (message.res && message.res[1] === 'resize_channel') {
            // Remove the listener once we get the response
            ws.removeListener('message', handleResizeResponse);
            
            // Extract broker state from response
            const brokerState = message.res[2][0];
            
            // Format resize state
            const resizeState = {
              channelId: brokerState.channel_id,
              stateData: brokerState.state_data,
              version: brokerState.version,
              intent: brokerState.intent,
              allocations: brokerState.allocations,
              serverSignature: brokerState.server_signature,
            };
            
            // Call client's resize method
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
              reject(new Error(`Error completing resize: ${error.message}`));
            });
          }
          
          // Check for error responses
          if (message.err) {
            ws.removeListener('message', handleResizeResponse);
            reject(new Error(`Error ${message.err[1]}: ${message.err[2]}`));
          }
        } catch (error) {
          console.error('Error handling resize response:', error);
        }
      };
      
      // Add the message handler
      ws.on('message', handleResizeResponse);
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        ws.removeListener('message', handleResizeResponse);
        reject(new Error('Resize timeout'));
      }, 15000);
      
      // Send the signed message
      ws.send(resizeMessage);
    });
  } catch (error) {
    console.error(`Error resizing channel ${channelId}:`, error);
    throw error;
  }
}

// Usage example
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

// Load the current channel state (could be from storage, previous API call, etc.)
const channelState = loadChannelState(channelId);

// Assuming you have a WebSocket connection and wallet initialized
resizeChannel(channelId, ws, wallet, channelState)
  .then(result => {
    if (result.success) {
      console.log(`Channel ${result.channelId} resized successfully`);
    }
  })
  .catch(error => {
    console.error('Failed to resize channel:', error);
  });
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
    // Retrieve channel ID from storage if available
    const storedChannelId = localStorage.getItem('nitrolite_channel_id');
    if (storedChannelId) {
      this.channelIdSubject.next(storedChannelId);
    }
  }
  
  public setWebSocket(ws: WebSocket): void {
    this.webSocket = ws;
  }
  
  public resizeChannel(
    signer: any,
    client: any,
    channelId: string
  ): Observable<any> {
    if (!this.webSocket) {
      throw new Error('WebSocket connection is not established');
    }
    
    if (!channelId) {
      throw new Error('Channel ID is required');
    }
    
    // Get stored channel state
    const channelStateJSON = localStorage.getItem('nitrolite_channel_state');
    if (!channelStateJSON) {
      throw new Error('No channel state found');
    }
    
    // Parse channel state
    const channelState = JSON.parse(channelStateJSON);
    
    return from(this.createResizeMessage(
      signer,
      channelId
    )).pipe(
      switchMap(message => this.sendResizeRequest(message)),
      switchMap(brokerState => this.processResize(client, brokerState, channelState)),
      tap(() => {
        console.log('Channel resized successfully');
      }),
      catchError(error => {
        console.error('Error resizing channel:', error);
        throw error;
      })
    );
  }
  
  private async createResizeMessage(
    signer: any,
    channelId: string
  ): Promise<string> {
    try {
      // Get user address from signer
      const address = await signer.getAddress();
      
      // Create resize parameters
      const resizeParams = [
        {
          channel_id: channelId,
          participant_change: 0, // No change in participants
          funds_destination: address,
        },
      ];
      
      // Create message signer function
      const messageSigner = async (payload: any) => {
        const message = JSON.stringify(payload);
        const digestHex = ethers.id(message);
        const messageBytes = ethers.getBytes(digestHex);
        const signature = await signer.signMessage(messageBytes);
        return signature;
      };
      
      // Create the resize message
      return await createResizeChannelMessage(messageSigner, resizeParams);
    } catch (error) {
      console.error('Error creating resize message:', error);
      throw error;
    }
  }
  
  private sendResizeRequest(resizeMessage: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.webSocket) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.res && message.res[1] === 'resize_channel') {
            this.webSocket?.removeEventListener('message', handleMessage);
            
            // Extract broker state
            const brokerState = message.res[2][0];
            resolve(brokerState);
          }
          
          if (message.err) {
            this.webSocket?.removeEventListener('message', handleMessage);
            reject(new Error(`Error: ${message.err[1]} - ${message.err[2]}`));
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      this.webSocket.addEventListener('message', handleMessage);
      this.webSocket.send(resizeMessage);
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        this.webSocket?.removeEventListener('message', handleMessage);
        reject(new Error('Resize channel timeout'));
      }, 15000);
    });
  }
  
  private async processResize(client: any, brokerState: any, channelState: any): Promise<any> {
    // Format the resize state data
    const resizeStateData = {
      channelId: brokerState.channel_id,
      stateData: brokerState.state_data,
      version: brokerState.version,
      intent: brokerState.intent,
      allocations: brokerState.allocations.map((alloc: any) => ({
        destination: alloc.destination,
        token: alloc.token,
        amount: alloc.amount,
      })),
      serverSignature: brokerState.server_signature,
    };
    
    // Call the client's resizeChannel method
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
      <div *ngIf="channelId">
        Current Channel ID: {{ channelId }}
        <button (click)="resizeChannel()" [disabled]="isResizing">
          {{ isResizing ? 'Resizing...' : 'Resize Channel' }}
        </button>
      </div>
      
      <div *ngIf="!channelId" class="info-message">
        No active channel found.
      </div>
      
      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>
      
      <div *ngIf="success" class="success-message">
        Channel resized successfully!
      </div>
    </div>
  `,
  styles: [`
    .channel-container {
      margin: 20px;
      padding: 15px;
      border: 1px solid #eee;
      border-radius: 5px;
    }
    .error-message {
      color: red;
      margin-top: 10px;
    }
    .success-message {
      color: green;
      margin-top: 10px;
    }
    .info-message {
      color: blue;
      margin-top: 10px;
    }
  `]
})
export class ChannelResizeComponent implements OnInit {
  channelId: string | null = null;
  isResizing = false;
  error: string | null = null;
  success = false;
  
  constructor(
    private channelResizeService: ChannelResizeService,
    private nitroliteClient: any // Your client service
  ) {}
  
  ngOnInit(): void {
    // Subscribe to channel ID changes
    this.channelResizeService.channelId$.subscribe(id => {
      this.channelId = id;
      this.success = false;
    });
    
    // Initialize WebSocket (implementation would depend on your setup)
    const ws = new WebSocket('wss://your-clearnode-endpoint');
    ws.onopen = () => {
      this.channelResizeService.setWebSocket(ws);
    };
  }
  
  resizeChannel(): void {
    if (!this.channelId) {
      this.error = 'No active channel';
      return;
    }
    
    this.isResizing = true;
    this.error = null;
    this.success = false;
    
    // Assuming you have access to a signer (e.g., from MetaMask)
    const signer = window.ethereum && new ethers.providers.Web3Provider(window.ethereum).getSigner();
    
    if (!signer) {
      this.error = 'No wallet connected';
      this.isResizing = false;
      return;
    }
    
    this.channelResizeService.resizeChannel(
      signer,
      this.nitroliteClient,
      this.channelId
    ).subscribe({
      next: () => {
        this.success = true;
        this.isResizing = false;
      },
      error: (err) => {
        this.error = `Failed to resize channel: ${err.message}`;
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
      
      <button 
        @click="resizeChannel" 
        :disabled="isResizing || !isConnected"
      >
        {{ isResizing ? 'Resizing Channel...' : 'Resize Channel' }}
      </button>
    </div>
    
    <div v-else class="no-channel">
      <p>No active channel found.</p>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="success" class="success-message">
      Channel resized successfully!
    </div>
    
    <div v-if="!isConnected" class="warning-message">
      WebSocket not connected to ClearNode
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { createResizeChannelMessage } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

export default defineComponent({
  name: 'ChannelResize',
  
  setup() {
    const channelId = ref(localStorage.getItem('nitrolite_channel_id') || null);
    const channelState = ref(null);
    const isResizing = ref(false);
    const error = ref(null);
    const success = ref(false);
    const isConnected = ref(false);
    let webSocket = null;
    
    // Load channel state on mount
    onMounted(() => {
      // Load channel state from storage
      const storedState = localStorage.getItem('nitrolite_channel_state');
      if (storedState) {
        try {
          channelState.value = JSON.parse(storedState, (key, value) => {
            // Convert strings that look like BigInts back to BigInt
            if (typeof value === 'string' && /^\d+n$/.test(value)) {
              return BigInt(value.substring(0, value.length - 1));
            }
            return value;
          });
        } catch (err) {
          console.error('Error parsing channel state:', err);
        }
      }
      
      // Initialize WebSocket connection
      initWebSocket();
    });
    
    onUnmounted(() => {
      // Clean up WebSocket connection
      if (webSocket) {
        webSocket.close();
      }
    });
    
    const initWebSocket = () => {
      webSocket = new WebSocket('wss://your-clearnode-endpoint');
      
      webSocket.onopen = () => {
        isConnected.value = true;
        console.log('WebSocket connected to ClearNode');
      };
      
      webSocket.onclose = () => {
        isConnected.value = false;
        console.log('WebSocket disconnected from ClearNode');
      };
      
      webSocket.onerror = (e) => {
        isConnected.value = false;
        error.value = 'WebSocket connection error';
        console.error('WebSocket error:', e);
      };
    };
    
    const resizeChannel = async () => {
      if (!isConnected.value || !webSocket) {
        error.value = 'WebSocket not connected';
        return;
      }
      
      if (!channelId.value) {
        error.value = 'No channel ID found';
        return;
      }
      
      if (!channelState.value) {
        error.value = 'No channel state found';
        return;
      }
      
      try {
        isResizing.value = true;
        error.value = null;
        success.value = false;
        
        // Get Ethereum provider and signer
        if (!window.ethereum) {
          throw new Error('No Ethereum provider found');
        }
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        // Create resize parameters
        const resizeParams = [
          {
            channel_id: channelId.value,
            participant_change: 0, // No participant changes
            funds_destination: address,
          },
        ];
        
        // Message signer function
        const messageSigner = async (payload) => {
          const message = JSON.stringify(payload);
          const digestHex = ethers.id(message);
          const messageBytes = ethers.getBytes(digestHex);
          return await signer.signMessage(messageBytes);
        };
        
        // Create the resize message
        const resizeMessage = await createResizeChannelMessage(
          messageSigner,
          resizeParams
        );
        
        // Send the message and get broker state
        const brokerState = await sendWebSocketRequest(resizeMessage);
        
        // Format resize state data
        const resizeStateData = {
          channelId: brokerState.channel_id,
          stateData: brokerState.state_data,
          version: brokerState.version,
          intent: brokerState.intent,
          allocations: brokerState.allocations.map(alloc => ({
            destination: alloc.destination,
            token: alloc.token,
            amount: alloc.amount,
          })),
          serverSignature: brokerState.server_signature,
        };
        
        // Call the client resize method
        await window.nitroliteClient.resizeChannel({
          resizeState: resizeStateData,
          proofStates: [channelState.value],
        });
        
        success.value = true;
        
        // Optionally refresh channel state after resize
        await refreshChannelState();
        
      } catch (err) {
        error.value = err.message || 'Error resizing channel';
        console.error('Failed to resize channel:', err);
      } finally {
        isResizing.value = false;
      }
    };
    
    const sendWebSocketRequest = (payload) => {
      return new Promise((resolve, reject) => {
        const handleMessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.res && message.res[1] === 'resize_channel') {
              webSocket.removeEventListener('message', handleMessage);
              
              // Extract broker state
              const brokerState = message.res[2][0];
              resolve(brokerState);
            }
            
            if (message.err) {
              webSocket.removeEventListener('message', handleMessage);
              reject(new Error(`Error: ${message.err[1]} - ${message.err[2]}`));
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
        
        webSocket.addEventListener('message', handleMessage);
        webSocket.send(payload);
        
        // Set timeout to prevent hanging
        setTimeout(() => {
          webSocket.removeEventListener('message', handleMessage);
          reject(new Error('Resize channel timeout'));
        }, 15000);
      });
    };
    
    const refreshChannelState = async () => {
      // This would be implemented based on your client's API
      // to retrieve the latest channel state after resize
      try {
        const newState = await window.nitroliteClient.getChannelState(channelId.value);
        
        // Save to local storage
        localStorage.setItem(
          'nitrolite_channel_state', 
          JSON.stringify(newState, (key, value) => {
            // Convert BigInts to a format that can be saved in JSON
            if (typeof value === 'bigint') {
              return value.toString() + 'n';
            }
            return value;
          })
        );
        
        // Update state ref
        channelState.value = newState;
        
      } catch (err) {
        console.error('Error refreshing channel state:', err);
      }
    };
    
    return {
      channelId,
      isResizing,
      error,
      success,
      isConnected,
      resizeChannel
    };
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
.error-message {
  color: #d32f2f;
  margin-top: 10px;
}
.success-message {
  color: #388e3c;
  margin-top: 10px;
}
.warning-message {
  color: #f57c00;
  margin-top: 10px;
}
button {
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background-color: #bbdefb;
  cursor: not-allowed;
}
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

The resize request message includes:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `channel_id` | Identifier for the channel to resize | `"0x1234567890abcdef..."` |
| `participant_change` | Indicates changes to participants (usually 0) | `0` (no change) |
| `funds_destination` | Address where funds would go | `"0xUserAddress..."` |

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

## Common Use Cases for Channel Resize

| Scenario | Description | Implementation Details |
|----------|-------------|------------------------|
| **Pre-closure Preparation** | Ensuring broker has sufficient funds to close the channel | Use resize before closure to adjust broker funds |
| **Adding Capacity** | Increasing channel capacity for continued operations | Add funds to the channel with appropriate allocations |
| **Balance Adjustment** | Adjusting balances between participants | Resize with new allocation values |
| **Recovery** | Recovering from an inconsistent state | Work with broker to establish correct state |

## Best Practices

When resizing channels, follow these best practices:

1. **Always store channel states** so they're available when needed for resize operations
2. **Validate broker responses** by checking signatures and parameters
3. **Implement proper error handling** for timeout and connection issues
4. **Clean up event listeners** to prevent memory leaks
5. **Provide clear user feedback** during the resize process

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
---
sidebar_position: 5
title: Connect to the ClearNode
description: Establish connection with ClearNode for reliable off-chain transaction processing and verification.
keywords: [erc7824, nitrolite, clearnode, off-chain, validation, messaging]
---

# Connect to the ClearNode

A ClearNode is a specialized service that facilitates off-chain communication, message relay, and state validation in the Nitrolite ecosystem. This guide explains how to establish and manage connections to a ClearNode.

## What is a ClearNode?

A ClearNode serves several important functions in the state channel network:

- Relays messages between channel participants
- Verifies signatures and validates state updates
- Provides history and audit trails of channel operations
- Acts as a persistent connection point for participants
- Helps with channel synchronization

## Connecting to a ClearNode

After initializing your client and creating a channel, connect to a ClearNode to enable off-chain communication:

```javascript
()() Connect to the default ClearNode (specified during client initialization)
await client.connectToClearNode();

()() Or connect to a specific ClearNode
await client.connectToClearNode({
  url: 'wss:()(clearnode).example.com',
  apiKey: 'your-optional-api-key',
  channelId: 'your-channel-id' ()() Optional: connect for a specific channel
});

console.log('Connected to ClearNode');
```

## Verifying Connection Status

You can check the connection status at any time:

```javascript
()() Check ClearNode connection status
const isConnected = client.isClearNodeConnected();
console.log(`ClearNode connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);

()() Get connection details
const clearNodeInfo = client.getClearNodeInfo();
console.log('Connected to:', clearNodeInfo.url);
console.log('Connection established at:', clearNodeInfo.connectedAt);
```

## Monitoring ClearNode Events

The client emits events related to the ClearNode connection:

```javascript
()() Listen for ClearNode connection events
client.on('clearNodeConnected', (info) => {
  console.log(`Connected to ClearNode at ${info.url}`);
});

client.on('clearNodeDisconnected', (reason) => {
  console.log(`Disconnected from ClearNode: ${reason}`);
});

client.on('clearNodeMessage', (message) => {
  console.log('Received message from ClearNode:', message);
});
```

## Handling Connection Errors

Connection issues can occur due to network problems or ClearNode maintenance:

```javascript
()() Handle connection errors
try {
  await client.connectToClearNode();
} catch (error) {
  console.error('Failed to connect to ClearNode:', error);
  
  ()() Implement retry logic
  setTimeout(async () => {
    console.log('Retrying ClearNode connection...');
    try {
      await client.connectToClearNode();
      console.log('Successfully reconnected to ClearNode');
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }
  }, 5000); ()() Retry after 5 seconds
}
```

## Disconnecting from a ClearNode

When you're done with your session, properly disconnect from the ClearNode:

```javascript
()() Disconnect from the ClearNode
await client.disconnectFromClearNode();
console.log('Disconnected from ClearNode');
```

## ClearNode Selection Strategy

For production applications, consider implementing a ClearNode selection strategy:

```javascript
()() Example of a ClearNode selection strategy
async function selectBestClearNode() {
  ()() List of available ClearNodes
  const clearNodes = [
    'wss:()(clearnode)1.example.com',
    'wss:()(clearnode)2.example.com',
    'wss:()(clearnode)3.example.com'
  ];
  
  ()() Test connection speed to each ClearNode
  const results = await Promise.all(
    clearNodes.map(async (url) => {
      const startTime = Date.now();
      try {
        await fetch(`https:()()${url.replace('wss:()()', '')}(health)`);
        const latency = Date.now() - startTime;
        return { url, latency, status: 'available' };
      } catch (error) {
        return { url, latency: Infinity, status: 'unavailable' };
      }
    })
  );
  
  ()() Select the fastest available ClearNode
  const bestClearNode = results
    .filter(node => node.status === 'available')
    .sort((a, b) => a.latency - b.latency)[0];
  
  return bestClearNode?.url;
}

()() Use the selection strategy
const bestClearNodeUrl = await selectBestClearNode();
if (bestClearNodeUrl) {
  await client.connectToClearNode({ url: bestClearNodeUrl });
} else {
  console.error('No ClearNodes available');
}
```

## Next Steps

After connecting to a ClearNode, you can:

1. [View and manage channel assets]((balances))
2. [Create an application session]((application_session))
3. [Start transacting off-chain]((application_session)#sending-transactions)
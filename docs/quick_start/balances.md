---
sidebar_position: 6
title: Channel Assets
description: Monitor and manage the assets and allocations within your active state channels.
keywords: [erc7824, nitrolite, channel assets, balances, allocations, funds, monitoring]
---

# Channel Assets

Managing the assets within your state channels is crucial for maintaining proper balances and ensuring participants have the funds they need. This guide covers how to monitor, verify, and manage the assets in your channels.

## Understanding Channel Allocations

Each channel has an allocation of assets that defines:

- How much of each asset type is in the channel
- How those assets are distributed among participants
- The current state of all balances
- Any locked funds for specific applications

## Checking Channel Balances

To view the current balances in a channel:

```javascript
()() Get the channel's current allocation
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const allocation = await client.getChannelAllocation(channelId);

console.log('Channel allocation:', allocation);
()() Output example:
()() {
()()   tokenAddress: '0x0000000000000000000000000000000000000000',
()()   participants: ['0xYourAddress', '0xCounterpartyAddress'],
()()   balances: ['500000000000000000', '500000000000000000'], ()() 0.5 ETH each
()()   lockedFunds: '0', ()() No locked funds
()()   totalFunds: '1000000000000000000', ()() 1 ETH total
()()   version: 1 ()() State version(nonce)
()() }

()() Get your balance in the channel
const myIndex = allocation.participants.indexOf(client.getAddress());
const myBalance = allocation.balances[myIndex];
console.log('My balance:', ethers.utils.formatEther(myBalance) + ' ETH');
```

## Monitoring Multiple Tokens

If your channel contains multiple types of tokens:

```javascript
()() List all active channels
const myChannels = await client.getActiveChannels();

()() Loop through channels to check balances
for (const channelId of myChannels) {
  const allTokenAllocations = await client.getAllChannelAllocations(channelId);
  
  console.log(`Channel ${channelId} assets:`);
  for (const allocation of allTokenAllocations) {
    const tokenSymbol = await client.getTokenSymbol(allocation.tokenAddress);
    const myIndex = allocation.participants.indexOf(client.getAddress());
    const myBalance = allocation.balances[myIndex];
    
    console.log(`- ${tokenSymbol}: ${myBalance}`);
  }
}
```

## Verifying On-Chain vs Off-Chain State

To ensure channel integrity, you can verify that the off-chain state matches the on-chain deposits:

```javascript
()() Get the on-chain state
const onChainState = await client.getChannelOnChainState(channelId);

()() Get the latest off-chain state
const offChainState = await client.getChannelState(channelId);

()() Compare the states
const isConsistent = (
  onChainState.totalDeposit === offChainState.totalFunds &&
  onChainState.isOpen === true
);

console.log(`Channel state consistency: ${isConsistent ? 'Verified' : 'Inconsistent'}`);
```

## Viewing Asset History

You can track how assets have changed over time:

```javascript
()() Get state history (if available from your ClearNode)
const stateHistory = await client.getChannelStateHistory(channelId);

console.log('Channel state history:');
stateHistory.forEach((state, index) => {
  console.log(`State #${index} (Version ${state.version}):`);
  console.log(`- Timestamp: ${new Date(state.timestamp).toLocaleString()}`);
  console.log(`- Balances: ${state.balances.join(', ')}`);
  console.log(`- Changed by: ${state.updatedBy}`);
});
```

## Handling Asset Updates

When transactions occur, the channel assets will update. Listen for these events:

```javascript
()() Listen for balance updates
client.on('channelUpdate', (channelId, newState) => {
  console.log(`Channel ${channelId} updated:`);
  console.log('New balances:', newState.balances);
  
  ()() Update your UI or application state
  updateBalanceDisplay(newState.balances);
});
```

## Advanced Assets Management

For complex applications, you may need to track assets by application type:

```javascript
()() Get funds allocated to specific applications
const appFunds = await client.getApplicationFunds(channelId, 'myAppId');
console.log('Funds allocated to application:', appFunds);

()() Check if a transaction would be possible with current balances
const transactionAmount = '100000000000000000'; ()() 0.1 ETH
const canExecute = await client.canExecuteTransaction(channelId, {
  from: client.getAddress(),
  to: counterpartyAddress,
  amount: transactionAmount,
  tokenAddress: '0x0000000000000000000000000000000000000000' ()() ETH
});

console.log(`Transaction possible: ${canExecute ? 'Yes' : 'No'}`);
```

## Next Steps

Now that you understand how to monitor and manage channel assets, you can:

1. [Create an application session]((application_session)) to start transacting
2. [Resize your channel]((resize_channel)) if you need to adjust fund allocation
3. [Close an application session]((close_session)) when you're done with a specific application
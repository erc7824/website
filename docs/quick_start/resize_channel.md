---
sidebar_position: 9
title: Resize Channel
description: Adjust the funds locked in a channel to accommodate changing transaction requirements.
keywords: [erc7824, nitrolite, resize channel, funding, state channels]
---

# Resize Channel

Resizing a channel allows you to adjust the funds allocated to it without closing and reopening the channel. This guide explains how to safely increase or decrease channel capacity.

## Why Resize a Channel?

You might need to resize a channel for several reasons:

- Add more funds when the channel is running low
- Reduce allocated funds when they're no longer needed
- Adjust allocations for a new use case
- Optimize fund distribution across multiple channels

## Channel Resize Methods

Nitrolite supports two primary methods for resizing a channel:

1. **Fund Addition**: Adding more funds to the channel
2. **Fund Removal**: Taking some funds out (partial withdrawal)

## Adding Funds to a Channel

To increase a channel's capacity by adding more funds:

```javascript
()() Get the channel ID
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

()() Amount to add (in smallest unit, e.g., wei for ETH)
const additionalAmount = '1000000000000000000'; ()() 1 ETH

()() Step 1: Deposit additional funds to the custody contract (if not already there)
const depositTx = await client.deposit({
  amount: additionalAmount,
  tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH (zero address)
});
await depositTx.wait();
console.log('Additional funds deposited to custody contract');

()() Step 2: Add funds to the channel
const resizeTx = await client.addFundsToChannel({
  channelId: channelId,
  amount: additionalAmount,
  tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH
  beneficiary: client.getAddress(), ()() Address that will receive the added funds
});

()() Wait for the transaction to be confirmed
const receipt = await resizeTx.wait();
console.log('Channel resized successfully:', receipt.transactionHash);

()() Check the new channel capacity
const updatedAllocation = await client.getChannelAllocation(channelId);
console.log('Updated channel allocation:', updatedAllocation);
```

## Removing Funds from a Channel

To decrease a channel's capacity:

```javascript
()() Amount to remove (in smallest unit)
const withdrawAmount = '500000000000000000'; ()() 0.5 ETH

()() Check if the withdrawal is possible
const canWithdraw = await client.canRemoveFundsFromChannel({
  channelId: channelId,
  amount: withdrawAmount,
  tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH
  participant: client.getAddress(),
});

if (canWithdraw) {
  ()() All participants must agree to the withdrawal
  const withdrawalProposal = await client.proposeChannelWithdrawal({
    channelId: channelId,
    amount: withdrawAmount,
    tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH
    beneficiary: client.getAddress(), ()() Who will receive the funds
  });
  
  ()() Wait for counterparty approval
  client.on('withdrawalApproved', async (approvedChannelId) => {
    if (approvedChannelId === channelId) {
      ()() Execute the withdrawal transaction
      const withdrawTx = await client.removeFundsFromChannel({
        channelId: channelId,
        amount: withdrawAmount,
        tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH
        beneficiary: client.getAddress(),
      });
      
      await withdrawTx.wait();
      console.log('Funds successfully removed from channel');
    }
  });
} else {
  console.log('Withdrawal not possible. Check channel balances and active sessions.');
}
```

## Coordinating with Counterparties

For channel resizing, all participants typically need to coordinate:

```javascript
()() Notify counterparties about resize intent
await client.notifyChannelResize({
  channelId: channelId,
  proposedAction: 'add', ()() or 'remove'
  amount: '1000000000000000000',
  tokenAddress: '0x0000000000000000000000000000000000000000',
  reason: 'Need additional capacity for upcoming transactions',
});

()() Listen for resize approvals
client.on('resizeApproved', (approvedChannelId, action) => {
  if (approvedChannelId === channelId) {
    console.log(`Channel resize (${action}) approved by all participants`);
    ()() Proceed with the resize transaction
    executeResizeAction(channelId, action);
  }
});
```

## Handling Multiple Token Types

For channels with multiple token types, you can resize each token independently:

```javascript
()() Resize for ERC20 token
const tokenAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';

()() First approve the token for the custody contract (if adding funds)
const approveTx = await client.approveTokenForDeposit({
  tokenAddress: tokenAddress,
  amount: additionalAmount,
});
await approveTx.wait();

()() Add the token to the channel
const tokenResizeTx = await client.addFundsToChannel({
  channelId: channelId,
  amount: additionalAmount,
  tokenAddress: tokenAddress,
  beneficiary: client.getAddress(),
});
await tokenResizeTx.wait();
```

## Verifying Resize Success

After resizing, verify that the channel state has been updated correctly:

```javascript
()() Verify on-chain state
const onChainState = await client.getChannelOnChainState(channelId);
console.log('On-chain channel state:', onChainState);

()() Check off-chain allocation
const offChainAllocation = await client.getChannelAllocation(channelId);
console.log('Off-chain allocation:', offChainAllocation);

()() Ensure consistency
const isConsistent = (
  onChainState.totalDeposit === offChainAllocation.totalFunds &&
  onChainState.isOpen === true
);
console.log(`Channel state consistency: ${isConsistent ? 'Verified' : 'Inconsistent'}`);
```

## Next Steps

After resizing your channel, you can:

1. [Continue with existing application sessions]((application_session))
2. [Create new application sessions]((application_session)) with the updated capacity
3. [Monitor channel assets]((balances)) to track your new balances
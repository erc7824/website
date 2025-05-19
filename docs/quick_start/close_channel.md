---
sidebar_position: 11
title: Close Channel
description: Properly shut down a state channel and settle the final state on-chain.
keywords: [erc7824, nitrolite, close channel, finalize, settlement, state channels]
---

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

## Cooperative Channel Closure

The preferred way to close a channel is through mutual agreement:

```javascript
()() Get the channel ID
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

()() First, ensure all application sessions are closed
const activeSessions = await client.getActiveApplicationSessions(channelId);
if (activeSessions.length > 0) {
  console.log('Please close all active sessions before closing the channel');
  ()() Close each active session
  for (const sessionId of activeSessions) {
    await client.closeApplicationSession({ sessionId });
  }
}

()() Get the latest signed state
const latestState = await client.getLatestChannelState(channelId);

()() Propose channel closure to counterparties
const proposalResult = await client.proposeChannelClosure({
  channelId: channelId,
  finalState: latestState
});

console.log('Channel closure proposed:', proposalResult);
```

## Waiting for Counterparty Agreement

All participants must agree to close the channel:

```javascript
()() Listen for closure agreement from counterparties
client.on('channelClosureApproved', async (approvedChannelId) => {
  if (approvedChannelId === channelId) {
    console.log('All participants have agreed to close the channel');
    
    ()() Execute the channel closure
    const closeTx = await client.closeChannel({
      channelId: channelId,
      finalState: latestState
    });
    
    const receipt = await closeTx.wait();
    console.log('Channel closed successfully:', receipt.transactionHash);
  }
});
```

## Closing with Signed Final State

If you already have a signed final state from all participants:

```javascript
()() Close the channel with a pre-signed final state
const signedFinalState = await client.getSignedFinalState(channelId);

if (signedFinalState && signedFinalState.signatures.length === participants.length) {
  ()() Execute the channel closure directly
  const closeTx = await client.closeChannel({
    channelId: channelId,
    finalState: signedFinalState
  });
  
  const receipt = await closeTx.wait();
  console.log('Channel closed with pre-signed state:', receipt.transactionHash);
} else {
  console.log('Missing signatures from some participants');
}
```

## Handling Non-Cooperative Closure

If your counterparty is unresponsive, you might need to use the challenge mechanism:

```javascript
()() Check if counterparty has been unresponsive
if (counterpartyUnresponsiveForLongTime()) {
  console.log('Initiating non-cooperative closure via challenge...');
  
  ()() Start a challenge
  const challengeTx = await client.challengeChannel({
    channelId: channelId,
    state: latestState
  });
  
  await challengeTx.wait();
  console.log('Challenge initiated. Waiting for challenge period to expire...');
  
  ()() After challenge period expires, finalize the challenge
  ()() This would typically be handled by a separate process(script)
  ()() that waits for the challenge period to end
  const challengeDetails = await client.getChannelChallengeDetails(channelId);
  const challengeExpirationTime = challengeDetails.expirationTime * 1000; ()() Convert to milliseconds
  
  console.log(`Challenge expires at: ${new Date(challengeExpirationTime).toLocaleString()}`);
}
```

## Verifying Channel Closure

After closing a channel, verify that it's properly closed:

```javascript
()() Verify the channel is closed
const channelStatus = await client.getChannelStatus(channelId);
console.log('Channel status:', channelStatus);

if (channelStatus === 'closed') {
  console.log('Channel is confirmed closed');
  
  ()() Check the final balances
  const finalBalances = await client.getFinalChannelBalances(channelId);
  console.log('Final channel balances:', finalBalances);
  
  ()() Check if withdrawal is ready
  const withdrawalReady = await client.isWithdrawalReady(channelId);
  console.log(`Ready for withdrawal: ${withdrawalReady ? 'Yes' : 'No'}`);
}
```

## On-Chain Settlement

When a channel is closed, the final state is settled on-chain:

```javascript
()() Check the on-chain settlement status
const settlementStatus = await client.getSettlementStatus(channelId);
console.log('Settlement status:', settlementStatus);

()() Get the transaction that settled the channel
const settlementTx = await client.getSettlementTransaction(channelId);
if (settlementTx) {
  console.log('Settlement transaction hash:', settlementTx);
  console.log('View transaction details at:', `https:()(etherscan).io(tx)()${settlementTx}`);
}
```

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
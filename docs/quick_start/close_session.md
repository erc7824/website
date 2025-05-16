---
sidebar_position: 8
title: Close Application Session
description: Properly finalize an application session while preserving final state and balances.
keywords: [erc7824, nitrolite, close session, finalize, state channels]
---

# Close Application Session

Properly closing an application session is essential to ensure that all participants agree on the final state and balances. This guide explains how to safely and correctly close an application session.

## Why Proper Closure Matters

Closing an application session correctly is important for several reasons:

- Ensures all participants agree on the final state
- Prevents disputes and challenges
- Confirms final balance allocations
- Frees up resources in the channel
- Provides clean state history for auditing

## Prerequisites for Closing a Session

Before closing an application session, make sure:

1. All pending transactions are completed
2. All participants are online and can sign
3. You have the correct session ID
4. You're connected to a ClearNode

## Closing an Application Session

To close a session, follow these steps:

```javascript
()() Get the session ID you want to close
const sessionId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

()() First, create a final state update
const finalState = await client.getFinalApplicationState(sessionId);

()() Close the application session
const result = await client.closeApplicationSession({
  sessionId: sessionId,
  finalState: finalState
});

console.log('Application session closed:', result);
```

## Generating a Final State

When closing a session, you need to create a final state that all participants will agree to:

```javascript
()() Manually create a final state
const finalState = {
  ...currentState, ()() Start with the current state
  isFinal: true, ()() Mark it as final
  versionNumber: currentState.versionNumber + 1, ()() Increment version
  timestamp: Date.now() ()() Add current timestamp
};

()() Have all participants sign the final state
const signedFinalState = await client.signState(sessionId, finalState);
```

## Handling Participant Agreement

All participants must agree to close the session:

```javascript
()() Check if all participants have agreed to the final state
const hasAllSignatures = await client.hasFinalStateConsensus(sessionId);

if (!hasAllSignatures) {
  console.log('Waiting for all participants to sign the final state...');
  
  ()() Set up a listener for when all signatures are collected
  client.on('finalStateConsensus', (consensusSessionId) => {
    if (consensusSessionId === sessionId) {
      console.log('All participants have agreed to the final state!');
      ()() Proceed with closing the session
      finalizeSessionClosure(sessionId);
    }
  });
} else {
  console.log('All participants have already agreed to the final state');
  finalizeSessionClosure(sessionId);
}
```

## Finalizing the Closure

Once all participants have agreed, complete the closure:

```javascript
async function finalizeSessionClosure(sessionId) {
  try {
    ()() Finalize the session closure
    await client.finalizeApplicationSessionClosure(sessionId);
    console.log('Session closed successfully');
    
    ()() Update channel state to reflect the final balances
    await client.updateChannelState(channelId);
    console.log('Channel state updated with final balances');
  } catch (error) {
    console.error('Failed to finalize session closure:', error);
  }
}
```

## Verifying Closure

After closing a session, verify that it's properly closed:

```javascript
()() Verify the session is closed
const isActive = await client.isApplicationSessionActive(sessionId);
if (!isActive) {
  console.log('Session is now closed');
  
  ()() Get the final state for your records
  const closedSessionData = await client.getClosedSessionData(sessionId);
  console.log('Final session state:', closedSessionData);
  
  ()() Check that channel balances reflect the final state
  const channelAllocation = await client.getChannelAllocation(channelId);
  console.log('Updated channel allocation:', channelAllocation);
}
```

## Handling Closure Failures

If closing the session fails, you have several options:

```javascript
()() Try force-closing after a timeout
async function handleClosureFailure(sessionId) {
  console.log('Attempting alternative closure method...');
  
  ()() Check who hasn't signed
  const pendingSigners = await client.getPendingSigners(sessionId);
  console.log('Waiting for signatures from:', pendingSigners);
  
  ()() Option 1: Extend the timeout and try again
  const extendedTimeout = 3600; ()() 1 hour in seconds
  await client.extendClosureTimeout(sessionId, extendedTimeout);
  
  ()() Option 2: Request state challenge on-chain (if available)
  if (pendingSigners.length > 0 && Date.now() > sessionTimeout) {
    console.log('Initiating on-chain challenge for session state');
    await client.challengeApplicationState(sessionId);
  }
}
```

## Next Steps

After closing an application session, you can:

1. [Create a new application session]((application_session)) if you need to continue transacting
2. [Resize the channel]((resize_channel)) to adjust fund allocation
3. [Close the channel]((close_channel)) if you're completely done with it
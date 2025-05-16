---
sidebar_position: 7
title: Create Application Session
description: Initialize a new application instance within your channel to support specific transaction types.
keywords: [erc7824, nitrolite, application session, state channels, app session]
---

# Create Application Session

Application sessions allow you to run specific applications within a state channel. Each application session has its own rules, state, and logic for handling transactions. This guide covers how to create and initialize application sessions.

## Understanding Application Sessions

An application session is a specific implementation of application logic that runs within a state channel. It defines:

- The rules for state transitions
- How funds are allocated
- The application's specific data structures
- Validation logic for transactions

## Prerequisites

Before creating an application session, ensure:

1. You have an active channel with sufficient funds
2. You're connected to a ClearNode for communication
3. All participants are online and available to sign the initial state

## Creating an Application Session

Here's how to create a basic application session:

```javascript
()() Define the application type and initial state
const appDefinition = {
  type: 'SimplePayment', ()() Application type
  appData: {
    description: 'Payment channel for service X',
    metadata: {
      serviceId: '12345',
      provider: 'ExampleService'
    }
  }
};

()() Create the application session
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const sessionId = await client.createApplicationSession({
  channelId: channelId,
  participants: ['0xYourAddress', '0xCounterpartyAddress'],
  initialState: {
    balances: ['500000000000000000', '500000000000000000'], ()() 0.5 ETH each
    appDefinition: appDefinition,
    versionNumber: 1,
    isFinal: false
  }
});

console.log('Application session created with ID:', sessionId);
```

## Application Types

Nitrolite supports several built-in application types:

| Application Type | Description | Use Case |
|-----------------|-------------|----------|
| `SimplePayment` | Basic payment channel | One-way or two-way payments |
| `TokenSwap` | Exchange of different tokens | Decentralized exchange |
| `TicTacToe` | Simple game implementation | Gaming applications |
| `LockRelease` | Time-locked transactions | Escrow services |
| `CustomApp` | Custom application logic | Any specialized logic |

## Custom Application Logic

For custom applications, you need to provide the application logic:

```javascript
()() Define a custom application with its own rules
const customAppDefinition = {
  type: 'CustomApp',
  appData: {
    name: 'MyCustomApp',
    version: '1.0.0',
  },
  ()() Define state validation rules
  validateState: (state, action) => {
    ()() Custom validation logic
    return isValidTransition(state, action);
  },
  ()() Define how to apply actions to the state
  applyAction: (state, action) => {
    ()() Custom state transition logic
    return newState;
  }
};

()() Register the custom application type
client.registerApplicationType('CustomApp', {
  validateState: customAppDefinition.validateState,
  applyAction: customAppDefinition.applyAction
});

()() Create session with the custom app
const customSessionId = await client.createApplicationSession({
  channelId: channelId,
  participants: ['0xYourAddress', '0xCounterpartyAddress'],
  initialState: {
    balances: ['500000000000000000', '500000000000000000'],
    appDefinition: customAppDefinition,
    versionNumber: 1,
    isFinal: false
  }
});
```

## Waiting for Participants to Join

All participants must agree to the initial state:

```javascript
()() Check if all participants have joined
const isReady = await client.isApplicationSessionReady(sessionId);

if (!isReady) {
  console.log('Waiting for all participants to join...');
  
  ()() Set up a listener for when the session is ready
  client.on('applicationSessionReady', (readySessionId) => {
    if (readySessionId === sessionId) {
      console.log('All participants have joined! Session is ready.');
      ()() Proceed with using the application session
      startApplication(sessionId);
    }
  });
} else {
  console.log('Session is already ready!');
  startApplication(sessionId);
}
```

## Session State Management

Once the session is created, you can check its current state:

```javascript
()() Get the current application state
const appState = await client.getApplicationState(sessionId);
console.log('Current application state:', appState);

()() Check if the session is still active
const isActive = await client.isApplicationSessionActive(sessionId);
console.log(`Session is ${isActive ? 'active' : 'inactive'}`);
```

## Application Session Lifecycle

A typical application session follows this lifecycle:

1. **Creation**: Define initial state and participants
2. **Initialization**: All participants join and sign the initial state
3. **Active State**: Participants exchange state updates and transactions
4. **Finalization**: Session is concluded and final state is signed
5. **Closure**: Session data is stored for potential dispute resolution

## Next Steps

After creating an application session, you can:

1. [Execute transactions within the session]((application_session)#executing-transactions)
2. [Monitor channel assets]((balances)) to track your balance
3. [Close the application session]((close_session)) when you're finished

For advanced use cases, see our [Application Development Guide]((advanced)(application_development)).
---
sidebar_position: 4
title: Deposit And Create Channel
description: Fund your state channel with assets and establish a secure connection between participants.
keywords: [erc7824, nitrolite, deposit, state channel, create channel, funding]
---

# Deposit And Create Channel

Creating a state channel involves depositing funds into a smart contract and establishing the channel parameters. This guide walks through the complete process of depositing assets and creating a functional state channel.

## Understanding Channels

A state channel is an agreement between two or more participants to transact off-chain while maintaining on-chain security guarantees. Before creating a channel, you should understand:

- Channels require on-chain deposits
- All participants must agree to channel terms
- Channel creation requires gas fees
- Funds will be locked in the contract until the channel is closed

## Step 1: Prepare for Channel Creation

Before creating a channel, ensure that:

1. Your client is properly initialized and connected to a wallet
2. You have sufficient ETH for gas fees
3. You have the assets you want to deposit into the channel
4. You have the address of your counterparty

```javascript
()() Check wallet balance before proceeding
const balance = await client.getWalletBalance();
console.log('Available balance:', balance);

()() Define channel participants
const participants = [
  client.getAddress(), ()() Your address (from connected wallet)
  '0x1234567890123456789012345678901234567890', ()() Counterparty address
];
```

## Step 2: Deposit Funds

Depositing funds involves interacting with the Nitrolite custody contract:

```javascript
()() Deposit funds into the custody contract
const depositAmount = '1000000000000000000'; ()() 1 ETH in wei
const depositTx = await client.deposit({
  amount: depositAmount,
  tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH address (zero address)
});

()() Wait for the transaction to be confirmed
const depositReceipt = await depositTx.wait();
console.log('Deposit confirmed:', depositReceipt.transactionHash);
```

For ERC20 tokens, you'll need to approve the contract first:

```javascript
()() For ERC20 tokens, approve the contract first
const tokenAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
const approvalTx = await client.approveTokenForDeposit({
  tokenAddress: tokenAddress,
  amount: depositAmount,
});
await approvalTx.wait();

()() Then deposit the ERC20 tokens
const tokenDepositTx = await client.deposit({
  amount: depositAmount,
  tokenAddress: tokenAddress,
});
await tokenDepositTx.wait();
```

## Step 3: Create the Channel

After depositing funds, you can create the channel:

```javascript
()() Create a new channel
const channelParams = {
  participants: participants,
  amounts: [depositAmount, '0'], ()() Initial allocation (you: 1 ETH, counterparty: 0)
  tokenAddress: '0x0000000000000000000000000000000000000000', ()() ETH
  challengePeriod: 86400, ()() 24 hours in seconds
  nonce: Date.now(), ()() Unique channel identifier
};

const createChannelTx = await client.createChannel(channelParams);
const channelReceipt = await createChannelTx.wait();

()() Get the channel ID
const channelId = await client.getChannelId(channelParams);
console.log('Channel created with ID:', channelId);
```

## Step 4: Verify Channel Creation

After creating the channel, verify that it exists and is properly funded:

```javascript
()() Verify channel state
const channelState = await client.getChannelState(channelId);
console.log('Channel state:', channelState);

()() Check your allocation in the channel
const myAllocation = await client.getChannelAllocation(channelId);
console.log('My allocation:', myAllocation);
```

## Channel Parameters Explained

When creating a channel, you need to specify several parameters:

| Parameter | Description |
|-----------|-------------|
| `participants` | Array of participant addresses (including yours) |
| `amounts` | Initial fund allocation for each participant |
| `tokenAddress` | Address of the token contract (zero address for ETH) |
| `challengePeriod` | Time in seconds for challenges before settlement |
| `nonce` | Unique identifier to prevent replay attacks |

## Next Steps

After creating your channel, you can:

1. [Connect to a ClearNode]((connect_to_the_clearnode)) for off-chain messaging
2. [View channel assets]((balances)) to monitor your funds
3. [Create an application session]((application_session)) to start transacting

For advanced channel operations, see the [Resize Channel]((resize_channel)) guide.
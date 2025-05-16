---
sidebar_position: 12
title: Withdrawal
description: Reclaim your funds from the state channel contract after channel closure.
keywords: [erc7824, nitrolite, withdrawal, state channels, custody contract]
---

# Withdrawal

After a channel is closed, you need to withdraw your funds from the custody contract. This guide explains the withdrawal process and how to safely retrieve your assets.

## Understanding Withdrawals

When a state channel is closed, the final state is settled on-chain, but funds remain in the custody contract until explicitly withdrawn. The withdrawal process:

- Transfers your entitled funds from the custody contract to your wallet
- Requires an on-chain transaction with gas fees
- Can be performed any time after channel closure
- Is the final step in the state channel lifecycle

## Prerequisites for Withdrawal

Before withdrawing funds, ensure:

1. The channel is properly closed
2. The challenge period has ended (if applicable)
3. The on-chain settlement is finalized
4. You have the wallet connected that was used in the channel

## Checking Withdrawal Availability

First, check if your funds are ready for withdrawal:

```javascript
()() Get the channel ID
const channelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

()() Check if withdrawal is available
const isWithdrawalReady = await client.isWithdrawalReady(channelId);
console.log(`Withdrawal ready: ${isWithdrawalReady ? 'Yes' : 'No'}`);

if (!isWithdrawalReady) {
  ()() Check why withdrawal isn't ready
  const channelStatus = await client.getChannelStatus(channelId);
  console.log('Channel status:', channelStatus);
  
  if (channelStatus === 'challenged') {
    const challengeDetails = await client.getChannelChallengeDetails(channelId);
    console.log('Challenge period ends at:', new Date(challengeDetails.expirationTime * 1000).toLocaleString());
  }
}
```

## Checking Withdrawable Amounts

Before withdrawing, check how much you're entitled to:

```javascript
()() Get withdrawable amounts for all assets
const withdrawableAssets = await client.getWithdrawableAssets(channelId);

console.log('Withdrawable assets:');
for (const asset of withdrawableAssets) {
  let symbol = asset.tokenAddress === '0x0000000000000000000000000000000000000000' 
    ? 'ETH' 
    : await client.getTokenSymbol(asset.tokenAddress);
  
  let formattedAmount = asset.tokenAddress === '0x0000000000000000000000000000000000000000'
    ? ethers.utils.formatEther(asset.amount)
    : ethers.utils.formatUnits(asset.amount, await client.getTokenDecimals(asset.tokenAddress));
  
  console.log(`- ${formattedAmount} ${symbol}`);
}
```

## Withdrawing ETH

To withdraw ETH from a closed channel:

```javascript
()() Withdraw ETH
try {
  const withdrawTx = await client.withdrawAssets({
    channelId: channelId,
    assetType: 'ETH',
    recipient: client.getAddress(), ()() Your address
  });
  
  console.log('Withdrawal transaction submitted:', withdrawTx.hash);
  
  ()() Wait for the transaction to be confirmed
  const receipt = await withdrawTx.wait();
  console.log('ETH withdrawal successful:', receipt.transactionHash);
  
  ()() Check your updated wallet balance
  const newBalance = await client.getWalletBalance();
  console.log('New wallet balance:', ethers.utils.formatEther(newBalance), 'ETH');
} catch (error) {
  console.error('Withdrawal failed:', error);
}
```

## Withdrawing ERC20 Tokens

For ERC20 tokens, the process is similar:

```javascript
()() Withdraw ERC20 tokens
const tokenAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
const tokenSymbol = await client.getTokenSymbol(tokenAddress);

try {
  const tokenWithdrawTx = await client.withdrawAssets({
    channelId: channelId,
    assetType: 'ERC20',
    tokenAddress: tokenAddress,
    recipient: client.getAddress(), ()() Your address
  });
  
  console.log(`${tokenSymbol} withdrawal transaction submitted:`, tokenWithdrawTx.hash);
  
  ()() Wait for the transaction to be confirmed
  const tokenReceipt = await tokenWithdrawTx.wait();
  console.log(`${tokenSymbol} withdrawal successful:`, tokenReceipt.transactionHash);
  
  ()() Check your updated token balance
  const newTokenBalance = await client.getTokenBalance(tokenAddress);
  const tokenDecimals = await client.getTokenDecimals(tokenAddress);
  console.log(`New ${tokenSymbol} balance:`, ethers.utils.formatUnits(newTokenBalance, tokenDecimals));
} catch (error) {
  console.error(`${tokenSymbol} withdrawal failed:`, error);
}
```

## Withdrawing All Assets at Once

For convenience, you can withdraw all assets at once:

```javascript
()() Withdraw all assets
try {
  const batchWithdrawTx = await client.withdrawAllAssets({
    channelId: channelId,
    recipient: client.getAddress(),
  });
  
  console.log('Batch withdrawal transaction submitted:', batchWithdrawTx.hash);
  
  ()() Wait for the transaction to be confirmed
  const batchReceipt = await batchWithdrawTx.wait();
  console.log('All assets withdrawn successfully:', batchReceipt.transactionHash);
} catch (error) {
  console.error('Batch withdrawal failed:', error);
}
```

## Verifying Withdrawal Completion

After withdrawal, verify that all funds have been received:

```javascript
()() Check if there are any remaining funds to withdraw
const remainingAssets = await client.getWithdrawableAssets(channelId);

if (remainingAssets.length === 0) {
  console.log('All assets have been successfully withdrawn');
} else {
  console.log('Some assets still need to be withdrawn:');
  for (const asset of remainingAssets) {
    console.log(`- ${asset.amount} ${asset.tokenAddress === '0x0000000000000000000000000000000000000000' ? 'ETH' : await client.getTokenSymbol(asset.tokenAddress)}`);
  }
}
```

## Troubleshooting Withdrawal Issues

If you encounter issues with withdrawal:

```javascript
()() Check for common withdrawal issues
async function troubleshootWithdrawal(channelId) {
  ()() Check if channel is actually closed
  const channelStatus = await client.getChannelStatus(channelId);
  if (channelStatus !== 'closed') {
    console.log(`Channel is not closed yet. Current status: ${channelStatus}`);
    return;
  }
  
  ()() Check if challenge period has ended
  const hasPendingChallenge = await client.hasActiveChallenge(channelId);
  if (hasPendingChallenge) {
    const challengeDetails = await client.getChannelChallengeDetails(channelId);
    console.log('Challenge period has not ended yet. Wait until:', new Date(challengeDetails.expirationTime * 1000).toLocaleString());
    return;
  }
  
  ()() Check if you have the correct wallet connected
  const channelParticipants = await client.getChannelParticipants(channelId);
  const connectedAddress = client.getAddress();
  if (!channelParticipants.includes(connectedAddress)) {
    console.log('You are not a participant in this channel. Please connect the correct wallet.');
    return;
  }
  
  ()() Check contract allowance for ERC20 tokens
  const withdrawableAssets = await client.getWithdrawableAssets(channelId);
  for (const asset of withdrawableAssets) {
    if (asset.tokenAddress !== '0x0000000000000000000000000000000000000000') {
      const allowance = await client.getContractAllowance(asset.tokenAddress);
      console.log(`Allowance for ${await client.getTokenSymbol(asset.tokenAddress)}: ${allowance}`);
    }
  }
  
  console.log('No obvious issues found. Please check your gas settings or contact support.');
}
```

## Next Steps

After successfully withdrawing all funds from a closed channel:

1. The channel lifecycle is complete - you can now create a new channel if needed
2. You can check your wallet balances to confirm all funds have been received
3. Consider reviewing the transaction history for your records
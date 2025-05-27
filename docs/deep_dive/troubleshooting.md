---
title: Troubleshooting
description: Common issues and solutions when working with Nitrolite
keywords: [troubleshooting, debug, errors, common issues, nitrolite, support]
---

# Troubleshooting

Common issues and solutions when working with the Nitrolite SDK.

## Installation Issues

### Node.js Version Compatibility

**Problem:** Getting errors during installation or runtime related to Node.js version.

**Solution:**
```bash
# Check your current Node.js version
node --version

# Nitrolite requires Node.js 18+
# Install using nvm (recommended)
nvm install 18
nvm use 18
npm install @erc7824/nitrolite
```

### Package Resolution Errors

**Problem:** `Cannot resolve module` or `Module not found` errors.

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For yarn users
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

### Webpack/Bundler Issues

**Problem:** Build errors in React, Vue, or other frameworks.

**Solution for Webpack 5:**
```javascript
// webpack.config.js or next.config.js
module.exports = {
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};
```

## Connection Issues

### WebSocket Connection Failed

**Problem:** Cannot connect to ClearNode.

**Solution:**
```javascript
// Check your WebSocket URL format
const ws = new WebSocket('wss://your-clearnode-domain.com/ws');

ws.onerror = (error) => {
  console.error('WebSocket connection failed:', error);
  
  // Check if ClearNode is running
  console.log('ClearNode should be running on port 8000');
  
  // Implement retry logic
  if (ws.readyState === WebSocket.CLOSED) {
    setTimeout(() => {
      console.log('Retrying connection...');
      // Retry connection with exponential backoff
    }, Math.min(1000 * Math.pow(2, retryCount), 30000));
  }
};

// For local development
const localWs = new WebSocket('ws://localhost:8000/ws');
```

### Provider Connection Issues

**Problem:** Ethereum provider not connecting or throwing errors.

**Solution:**
```javascript
// Check if MetaMask is installed
if (typeof window.ethereum === 'undefined') {
  throw new Error('MetaMask not installed');
}

// Request account access
try {
  await window.ethereum.request({ method: 'eth_requestAccounts' });
} catch (error) {
  if (error.code === 4001) {
    console.error('User rejected the request');
  } else {
    console.error('Unexpected error:', error);
  }
}

// Check network (example for Polygon)
const chainId = await window.ethereum.request({ method: 'eth_chainId' });
if (chainId !== '0x89') { // Polygon Mainnet
  // Request network switch
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x89' }],
  });
}
```

## Channel Operations

### Channel Creation Failing

**Problem:** Channel creation transactions fail or timeout.

**Common Causes & Solutions:**

1. **Insufficient Gas:**
```typescript
// Use Viem for gas estimation
import { estimateGas } from 'viem/actions';

const gasEstimate = await estimateGas(publicClient, {
  account: account.address,
  to: custodyContractAddress,
  data: callData,
});

// Add 20% buffer
const gasLimit = (gasEstimate * 120n) / 100n;
```

2. **Insufficient Balance:**
```typescript
// Check balance before operations
import { getBalance } from 'viem/actions';

const balance = await getBalance(publicClient, {
  address: account.address,
});

const requiredAmount = parseEther("0.1");
if (balance < requiredAmount) {
  throw new Error(`Insufficient balance. Required: ${formatEther(requiredAmount)} ETH`);
}
```

3. **Wrong Network:**
```typescript
// Verify you're on the correct network
const chainId = await publicClient.getChainId();
const expectedChainId = 137; // Polygon

if (chainId !== expectedChainId) {
  throw new Error(`Wrong network. Expected ${expectedChainId}, got ${chainId}`);
}
```

### State Update Failures

**Problem:** Off-chain state updates not being accepted.

**Solution:**
```typescript
// Check state version progression
const currentState = await channel.getState();
console.log('Current version:', currentState.version);

// Ensure proper participant signing
const expectedSigner = currentState.version % 2 === 0 ? creatorAddress : brokerAddress;
console.log('Expected signer:', expectedSigner);

// Verify signature with Viem
import { verifyMessage } from 'viem';

const isValid = await verifyMessage({
  address: expectedSigner,
  message: stateHash,
  signature: signature
});

if (!isValid) {
  throw new Error('Invalid signature');
}
```

## Common Error Codes

### Error: `INVALID_SIGNATURE`

**Cause:** Signature verification failed.

**Solution:**
```typescript
// Ensure you're signing the correct state hash format
import { keccak256, encodePacked } from 'viem';

const stateHash = keccak256(encodePacked(
  ['bytes32', 'bytes', 'uint256', 'tuple(address,address,uint256)[]'],
  [channelId, state.data, state.version, state.allocations]
));

const signature = await walletClient.signMessage({
  account,
  message: { raw: stateHash }
});

// Verify signature locally
const isValid = await verifyMessage({
  address: account.address,
  message: { raw: stateHash },
  signature
});
```

### Error: `CHANNEL_NOT_FOUND`

**Cause:** Trying to operate on a non-existent channel.

**Solution:**
```typescript
// Verify channel exists on-chain
import { readContract } from 'viem/actions';

const channelExists = await readContract(publicClient, {
  address: custodyContractAddress,
  abi: custodyAbi,
  functionName: 'channelExists',
  args: [channelId]
});

if (!channelExists) {
  console.error('Channel does not exist:', channelId);
  // Create channel first or verify channel ID calculation
}

// Check channel status
const channelStatus = await readContract(publicClient, {
  address: custodyContractAddress,
  abi: custodyAbi,
  functionName: 'getChannelStatus',
  args: [channelId]
});
```

### Error: `INSUFFICIENT_FUNDS`

**Cause:** Not enough funds in channel for operation.

**Solution:**
```javascript
// Check channel balance
const balance = await nitroliteClient.getChannelBalance(channelId);
console.log('Channel balance:', balance);

// Check individual allocations
const allocations = await nitroliteClient.getAllocations(channelId);
console.log('Current allocations:', allocations);

// Resize channel if needed
if (balance.lt(requiredAmount)) {
  await nitroliteClient.resizeChannel({
    channelId,
    additionalAmount: requiredAmount.sub(balance),
  });
}
```

## Performance Issues

### Slow Transaction Processing

**Problem:** Transactions taking too long to process.

**Solutions:**

1. **Optimize Gas Settings:**
```javascript
// Use [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) gas pricing
const tx = await nitroliteClient.deposit({
  // ... other params
  maxFeePerGas: ethers.parseUnits('20', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
});
```

2. **Batch Operations:**
```javascript
// Instead of multiple single operations
const operations = [
  { type: 'transfer', to: addr1, amount: '100' },
  { type: 'transfer', to: addr2, amount: '200' },
];

// Batch them in a single state update
await nitroliteClient.batchOperations(channelId, operations);
```

### Memory Leaks

**Problem:** Memory usage growing over time.

**Solution:**
```javascript
// Properly close WebSocket connections
const cleanup = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // Remove event listeners
  window.removeEventListener('beforeunload', cleanup);
};

window.addEventListener('beforeunload', cleanup);

// Clean up client resources
await nitroliteClient.disconnect();
```

## Development Environment

### TypeScript Errors

**Problem:** Type errors when using TypeScript.

**Solution:**
```bash
# Install type definitions
npm install --save-dev @types/node @types/ws

# Add to tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Hot Reload Issues

**Problem:** Changes not reflecting during development.

**Solution:**
```javascript
// For webpack-dev-server
module.exports = {
  devServer: {
    hot: true,
    // Add polling for file changes
    watchOptions: {
      poll: 1000,
    },
  },
};
```

## ClearNode Issues

### ClearNode Won't Start

**Problem:** ClearNode binary fails to start.

**Solution:**
```bash
# Check if required environment variables are set
echo $BROKER_PRIVATE_KEY
echo $DATABASE_URL

# Check if ports are available
lsof -i :8000  # HTTP port
lsof -i :4242  # Metrics port

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Start with debug logging
LOG_LEVEL=debug ./clearnode
```

### Database Connection Errors

**Problem:** ClearNode can't connect to database.

**Solution:**
```bash
# For PostgreSQL
psql $DATABASE_URL -c "SELECT version();"

# Check database permissions
psql $DATABASE_URL -c "CREATE TABLE test_table (id int);"
psql $DATABASE_URL -c "DROP TABLE test_table;"

# For SQLite
DATABASE_DRIVER=sqlite DATABASE_URL=clearnode.db ./clearnode
```

### RPC Connection Issues

**Problem:** Blockchain RPC calls failing.

**Solution:**
```bash
# Test RPC connectivity
curl -X POST $POLYGON_INFURA_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check rate limits
echo "Check your Infura/Alchemy rate limits"

# Use alternative RPC providers
POLYGON_INFURA_URL=https://polygon-rpc.com ./clearnode
```

## Getting Debug Information

### Enable Debug Logging

```bash
# For ClearNode
LOG_LEVEL=debug ./clearnode

# For client applications
localStorage.setItem('debug', 'nitrolite:*');
```

### Inspect WebSocket Messages

```javascript
// Log all WebSocket messages
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  console.log('WS Send:', data);
  return originalSend.call(this, data);
};

ws.addEventListener('message', (event) => {
  console.log('WS Receive:', event.data);
});
```

### ClearNode Metrics

```bash
# Check ClearNode health
curl http://localhost:4242/metrics

# Monitor key metrics
curl http://localhost:4242/metrics | grep clearnode_errors_total
curl http://localhost:4242/metrics | grep clearnode_active_connections
```

### Export Debug Information

```typescript
// Generate debug report for client issues
const debugInfo = {
  sdkVersion: '@erc7824/nitrolite@1.0.0',
  chainId: await publicClient.getChainId(),
  blockNumber: await publicClient.getBlockNumber(),
  userAddress: account.address,
  balance: await getBalance(publicClient, { address: account.address }),
  timestamp: new Date().toISOString(),
};

console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
```

## Getting Help

If you can't resolve your issue:

1. **Check existing issues:** [GitHub Issues](https://github.com/erc7824/nitrolite/issues)
2. **Search documentation:** Use the search function on this site
3. **Join the community:** [Discord](https://discord.gg/yellownetwork)
4. **Report a bug:** Include debug information and steps to reproduce

### When Reporting Issues

Please include:
- Nitrolite SDK version (`@erc7824/nitrolite`)
- ClearNode version (if self-hosting)
- Node.js/browser version
- Operating system
- Network and contract addresses
- Code snippet that reproduces the issue
- Error messages and stack traces
- Debug information and metrics
---
title: Security
description: Security considerations and best practices for Nitrolite applications
keywords: [security, best practices, vulnerabilities, smart contracts, state channels]
---

# Security

Comprehensive security guidance for building secure applications with Nitrolite.

## Security Model

### Core Security Principles

**1. Cryptographic Security**
- All state transitions require valid ECDSA signatures from participants
- State integrity protected by cryptographic hashing (keccak256)
- Version control prevents replay attacks through incremental state versioning

**2. Economic Security**
- Participants lock funds in Custody contract as commitment
- Challenge mechanisms provide dispute resolution
- Configurable challenge periods for time-bounded operations

**3. Two-Party Model**
- Simplified security with exactly two participants: Creator and Broker
- Clear role definitions reduce attack surface
- Deterministic state transitions based on participant signatures

<div align="center">
```mermaid
graph TB
    subgraph "Security Layers"
        A[Smart Contracts] --> B[ClearNode]
        B --> C[TypeScript SDK]
        C --> D[Application]
    end
    
    subgraph "Threat Vectors"
        E[Signature Forgery] --> A
        F[State Manipulation] --> A
        G[Network Attacks] --> B
        H[Client Vulnerabilities] --> C
        I[Application Logic] --> D
    end
    
    style A fill:#ffebee
    style B fill:#e8f5e8
    style C fill:#fff3e0
    style D fill:#e3f2fd
```
</div>

## Threat Analysis

### 1. **Signature-Based Attacks**

**Threat:** Malicious actors attempting to forge or replay signatures.

**Mitigations:**
```typescript
// Always verify signatures before processing
import { verifyMessage } from 'viem';

const isValid = await verifyMessage({
  address: expectedSigner,
  message: stateHash,
  signature: signature
});

if (!isValid) {
  throw new Error('Invalid signature');
}

// Check version number to prevent replays
if (newState.version <= currentState.version) {
  throw new Error('Invalid state version');
}

// Verify signer is expected participant (Creator or Broker)
const expectedSigner = state.version % 2 === 1 ? creatorAddress : brokerAddress;
if (recoveredSigner !== expectedSigner) {
  throw new Error('Unauthorized signer');
}
```

### 2. **State Manipulation**

**Threat:** Attempting to submit invalid or malicious state updates.

**Mitigations:**
```typescript
// Implement comprehensive state validation
function validateStateTransition(
  channel: Channel,
  prevState: State,
  newState: State,
  adjudicator: IAdjudicator
): boolean {
  // Basic validation
  if (newState.version !== prevState.version + 1) {
    return false;
  }
  
  // Adjudicator validation
  return adjudicator.adjudicate(channel, newState, [prevState]);
}

// Always validate locally before broadcasting
const isValid = validateStateTransition(channel, currentState, proposedState, adjudicator);
if (!isValid) {
  throw new Error('Invalid state transition');
}
```

### 3. **Network-Level Attacks**

**Threat:** Eclipse attacks, message interception, or network partitioning.

**Mitigations:**
```typescript
// Use multiple ClearNode connections for redundancy
const clearNodeUrls = [
  'wss://clearnode1.example.com/ws',
  'wss://clearnode2.example.com/ws'
];

// Implement WebSocket reconnection logic
class SecureWebSocketClient {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(url: string) {
    this.ws = new WebSocket(url);
    
    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(url);
        }, Math.pow(2, this.reconnectAttempts) * 1000);
      }
    };
  }
  
  // Verify message integrity
  async sendMessage(message: RPCMessage) {
    // Add timestamp for freshness
    message.timestamp = Date.now();
    
    // Sign message with private key
    message.sig = await this.signMessage(message);
    
    this.ws.send(JSON.stringify(message));
  }
}
```

### 4. **Smart Contract Vulnerabilities**

**Threat:** Bugs in smart contract logic enabling fund theft or manipulation.

**Prevention Measures:**
- **Battle-tested patterns:** Built on established state channel designs
- **Interface segregation:** Clear separation between IChannel, IDeposit, and IAdjudicator
- **Access controls:** Role-based permissions for critical functions
- **Atomic operations:** State changes happen atomically

```solidity
// Example: Custody contract security patterns
contract Custody is IChannel, IDeposit {
    // Constants for participant roles
    uint256 constant CREATOR = 0;
    uint256 constant BROKER = 1;
    
    // Reentrancy protection
    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    
    // Access control for channel operations
    modifier onlyParticipant(bytes32 channelId) {
        require(isParticipant(channelId, msg.sender), "Not authorized");
        _;
    }
    
    function close(bytes32 channelId, State calldata candidate, State[] calldata proofs) 
        external 
        onlyParticipant(channelId)
        nonReentrant()
    {
        // Withdrawal logic with checks-effects-interactions pattern
    }
}
```

## Best Practices

### 1. **Private Key Management**

**Secure Storage:**
```typescript
// NEVER store private keys in code or localStorage
// Use environment variables or secure key management

// Good: Environment variable
const privateKey = process.env.PRIVATE_KEY;

// Better: Hardware wallet integration
import { LedgerSigner } from '@ledgerhq/hw-app-eth';

// Best: Key management service
import { KMSClient } from '@aws-sdk/client-kms';
```

**ClearNode Key Security:**
```bash
# Store broker private key securely
export BROKER_PRIVATE_KEY="0x..."

# Use file permissions to protect .env
chmod 600 .env

# Rotate keys regularly
# Generate new key and update ClearNode configuration
```

### 2. **Message Verification**

**RPC Message Validation:**
```typescript
// Validate RPC message structure
function validateRPCMessage(message: RPCMessage): boolean {
  // Check required fields
  if (!message.req && !message.res) {
    return false;
  }
  
  // Verify timestamp freshness (prevent replay)
  const maxAge = 60000; // 1 minute
  const messageAge = Date.now() - message.timestamp;
  if (messageAge > maxAge) {
    return false;
  }
  
  // Verify signatures
  return message.sig.every(sig => verifySignature(message, sig));
}
```

### 3. **Network Security**

**ClearNode Configuration:**
```bash
# Use TLS/SSL for production
CLEARNODE_WS_URL=wss://your-domain.com/ws

# Implement rate limiting
MSG_EXPIRY_TIME=60

# Database security
DATABASE_URL=postgresql://user:pass@localhost:5432/clearnode?sslmode=require
```

**Client-Side Security:**
```typescript
// Validate message timestamps
function isMessageFresh(timestamp: number): boolean {
  const maxAge = 60000; // 1 minute
  return Date.now() - timestamp < maxAge;
}

// Verify WebSocket connection
const ws = new WebSocket('wss://clearnode.example.com/ws');
ws.onopen = () => {
  // Verify SSL certificate
  if (location.protocol !== 'https:') {
    console.warn('Insecure connection detected');
  }
};
```

## Production Security

### 1. **Infrastructure Hardening**

**ClearNode Deployment:**
- Use reverse proxy (nginx) with SSL termination
- Implement rate limiting and request filtering
- Monitor for unusual connection patterns
- Keep database connections secure and encrypted

**Key Management:**
- Store private keys in secure environment variables
- Use hardware security modules (HSMs) for high-value operations
- Implement key rotation procedures
- Never commit private keys to version control

### 2. **Monitoring and Alerts**

**Security Metrics:**
```bash
# Monitor ClearNode metrics
curl http://localhost:4242/metrics | grep clearnode_

# Key metrics to watch:
# - clearnode_errors_total
# - clearnode_active_connections  
# - clearnode_rpc_requests_total
```

**Alert Conditions:**
- High error rates (>5% over 5 minutes)
- Unusual connection patterns
- Failed authentication attempts
- Database connection issues

### 3. **Incident Response**

**Emergency Procedures:**
1. **Identify the threat** - Monitor logs and metrics
2. **Isolate affected systems** - Disable compromised connections
3. **Assess impact** - Check channel states and fund security
4. **Restore operations** - Deploy fixed version or revert changes
5. **Post-incident review** - Analyze root cause and improve security

## Security Checklist

**Before Production:**
- [ ] Private keys stored securely
- [ ] SSL/TLS enabled for all connections
- [ ] Database connections encrypted
- [ ] Rate limiting implemented
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Security team contact information documented

**Regular Maintenance:**
- [ ] Monitor security metrics daily
- [ ] Review logs for suspicious activity
- [ ] Update dependencies regularly  
- [ ] Rotate private keys quarterly
- [ ] Test backup and recovery procedures
- [ ] Review and update incident response procedures

## Resources

### Security Contacts
- **General Issues:** [GitHub Issues](https://github.com/erc7824/nitrolite/issues)
- **Security Vulnerabilities:** [Responsible Disclosure](https://github.com/erc7824/nitrolite/security)
- **Community Support:** [Discord](https://discord.gg/yellownetwork)

### Documentation
- **[Architecture Overview](../architecture/)** - System design and security model
- **[Deployment Guide](../deployment/)** - Production deployment security
- **[Troubleshooting](../troubleshooting)** - Common security issues and solutions
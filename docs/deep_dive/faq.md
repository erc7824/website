---
title: Technical FAQ
description: Technical questions and implementation details for Nitrolite developers
keywords: [faq, technical, implementation, state channels, nitrolite, developers]
---

# Technical FAQ

Implementation details and technical questions for developers building with Nitrolite.

## Protocol Implementation

### How does the ClearNode RPC protocol work?

ClearNode uses JSON-RPC over WebSocket with deterministic array serialization:

```json
{
  "req": [REQUEST_ID, METHOD, [PARAMETERS], TIMESTAMP],
  "sig": ["ECDSA_SIGNATURE"]
}
```

**Key Features:**
- **Array-based structure** ensures deterministic serialization across JSON implementations
- **Timestamp validation** with 60-second expiry prevents replay attacks
- **Session-based routing** via `AppSessionID` for virtual application isolation
- **Challenge-response authentication** using EIP-712 structured signing

### How does signature verification work across different chains?

Nitrolite uses **chain-agnostic signature verification** without EIP-191 prefixing:

```go
// Raw ECDSA signing without chain-specific prefixes
messageHash := crypto.Keccak256Hash(stateBytes)
signature, _ := crypto.Sign(messageHash.Bytes(), privateKey)
```

**Implementation Details:**
- **ECDSA with secp256k1** curve (Ethereum-compatible)
- **Keccak256 hashing** for message digests
- **65-byte signature format** (r,s,v) with v adjustment
- **Address recovery** using `crypto.SigToPub()` for authentication

### What is the channel state encoding format?

States are ABI-encoded with a specific structure:

```go
// State encoding: (channelID, intent, version, stateData, allocations[])
args := abi.Arguments{
    {Type: abi.Type{T: abi.FixedBytesTy, Size: 32}}, // channelID
    {Type: intentType},               // intent (uint8)
    {Type: versionType},              // version (uint256)
    {Type: abi.Type{T: abi.BytesTy}}, // stateData
    {Type: allocationType},           // allocations (tuple[])
}
```

**Intent Types:**
- `OPERATE(0)`: Normal application states
- `INITIALIZE(1)`: Channel funding states  
- `RESIZE(2)`: Capacity adjustment states
- `FINALIZE(3)`: Channel closing states

## Virtual Ledger System

### How does the double-entry accounting work?

ClearNode implements traditional double-entry bookkeeping with DECIMAL(64,18) precision:

```sql
CREATE TABLE ledger_entries (
    account_id VARCHAR NOT NULL,
    wallet VARCHAR NOT NULL,
    asset_symbol VARCHAR NOT NULL,
    credit DECIMAL(64,18) NOT NULL,
    debit DECIMAL(64,18) NOT NULL
);
```

**Balance Calculation:**
```go
// Balance = SUM(credit) - SUM(debit) for each (wallet, asset) pair
balance := totalCredits.Sub(totalDebits)
```

**Account Types:**
- **Participant accounts**: User wallet balances
- **Virtual app accounts**: Isolated application contexts
- **System accounts**: Protocol-level operations

### How do virtual applications achieve consensus?

Virtual apps use **weighted quorum-based consensus** configured during channel creation:

```go
// Check if combined signature weights meet quorum threshold
if totalWeight < int64(appSession.Quorum) {
    return fmt.Errorf("quorum not met: %d / %d", totalWeight, appSession.Quorum)
}
```

**Weight Configuration:**
```go
type App struct {
    Participants []address  // Array of participants in the app
    Weights      []uint8    // Signers weights [50, 50, 80, 20, 20]
    Quorum       uint64     // Example: 100 would be the signature threshold
}
```

**Consensus Flow:**
1. **State proposal** by any participant
2. **Signature collection** from participants until weight threshold met
3. **Validation** of weighted quorum achievement
4. **Ledger update** with atomic balance transfers

**Example Scenarios:**
- **Simple majority**: Weights [50, 50], Quorum 51
- **Supermajority**: Weights [25, 25, 25, 25], Quorum 75
- **Dictator + veto**: Weights [80, 20], Quorum 100

## Security Model

### How does challenge/response dispute resolution work?

The system uses **optimistic execution** with challenge periods:

```solidity
function challenge(bytes32 channelId, State calldata candidate, State[] calldata proofs) external {
    // Validate state via adjudicator
    if (!IAdjudicator(meta.chan.adjudicator).adjudicate(meta.chan, candidate, proofs)) 
        revert InvalidState();
    
    // Set challenge period
    meta.challengeExpire = block.timestamp + meta.chan.challenge;
    meta.stage = ChannelStatus.DISPUTE;
}
```

**Security Guarantees:**
- **Economic security**: Funds locked in custody contracts
- **Temporal security**: Challenge periods prevent hasty closures
- **Cryptographic security**: All state transitions require valid signatures

### How do session keys work?

Session keys enable **delegation without custody transfer**:

```solidity
// NOTE: it is allowed for depositor (and wallet) to be different from channel creator (participant)
// This enables logic of "session keys" where a user can create a channel on behalf of another account
```

**Implementation:**
- **Signer mapping**: `signers` table maps session keys to wallet addresses
- **Authentication flow**: EIP-712 structured signing for challenge-response
- **Session management**: 24-hour TTL with renewal capability
- **Scope limitation**: Session keys cannot withdraw funds, only sign state updates

## Performance and Scaling

### What are the performance bottlenecks?

**Identified Constraints:**
- **Single WebSocket per wallet**: Limits concurrent connections
- **Synchronous signature verification**: CPU-bound operation for each message
- **Database balance queries**: Not cached, requires computation
- **Memory-based sessions**: Cannot distribute across multiple ClearNode instances

### How does multi-chain asset handling work?

Each token-chain combination is treated as a distinct asset:

```go
type Asset struct {
    Token    string `gorm:"column:token;primaryKey"`
    ChainID  uint32 `gorm:"column:chain_id;primaryKey"` 
    Symbol   string `gorm:"column:symbol;not null"`
    Decimals uint8  `gorm:"column:decimals;not null"`
}
```

**Precision Handling:**
- **Consistent DECIMAL(64,18)** across all monetary calculations
- **Chain-specific decimals** stored per asset
- **Token address normalization** per chain
- **Independent custody contracts** per supported chain

### How does the system prevent replay attacks?

**Multi-layer Protection:**
- **Timestamp validation**: Messages expire after 60 seconds
- **State version monotonicity**: Version numbers must strictly increase
- **Nonce progression**: Channel nonces prevent duplicate operations
- **Challenge periods**: Time-locked dispute resolution

## Integration Considerations

### How do you handle WebSocket connection management?

**Connection Lifecycle:**
```go
// Authentication-first connection establishment
func (h *UnifiedWSHandler) authenticateConnection(ws *websocket.Conn) error {
    // Challenge-response authentication
    // Session token generation
    // Connection registration per wallet
}
```

**Features:**
- **One connection per wallet**: Latest connection replaces previous
- **Message forwarding**: Based on app session participants  
- **Graceful error handling**: Structured error responses
- **Metrics tracking**: Connections, messages, auth events

### What database schema optimizations are recommended?

**Critical Indexes:**
```sql
-- Balance calculation optimization
CREATE INDEX idx_ledger_wallet_asset ON ledger_entries(wallet, asset_symbol);

-- Channel lookup optimization  
CREATE INDEX idx_channels_participant ON channels(participant);

-- Session routing optimization
CREATE INDEX idx_app_sessions_participants ON app_sessions USING gin(participants);
```

**Schema Considerations:**
- **DECIMAL precision**: Use DECIMAL(64,18) for all monetary values
- **UUID vs incremental IDs**: UUIDs for app sessions, incremental for performance-critical tables
- **Partitioning**: Consider partitioning ledger_entries by time for large deployments

### How do you implement custom adjudicators?

Custom adjudicators must implement the `IAdjudicator` interface:

```solidity
interface IAdjudicator {
    function adjudicate(
        Channel calldata chan, 
        State calldata candidate, 
        State[] calldata proofs
    ) external view returns (bool valid);
}
```

**Implementation Patterns:**
- **Stateless validation**: Pure functions based on provided proofs
- **State transition rules**: Validate moves from previous to current state
- **Business logic**: Game rules, payment conditions, etc.
- **Proof requirements**: Define what constitutes valid state transitions

---

For additional technical details, consult the [Architecture Overview](architecture/) or examine the [ClearNode source code](https://github.com/erc7824/nitrolite/tree/main/clearnode).
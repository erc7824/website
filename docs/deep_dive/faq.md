---
title: Technical FAQ
description: Technical questions and implementation details for Nitrolite developers
keywords: [faq, technical, implementation, state channels, nitrolite, developers]
---

# Technical FAQ

Implementation details and technical questions for developers building with Nitrolite.

## Protocol Implementation

<details>
  <summary><strong>How does the ClearNode RPC protocol work?</strong></summary>
  <div>
    <p>ClearNode uses JSON-RPC over WebSocket with deterministic array serialization:</p>

```json
{
  "req": [REQUEST_ID, METHOD, [PARAMETERS], TIMESTAMP],
  "sig": ["ECDSA_SIGNATURE"]
}
```

<p><strong>Key Features:</strong></p>
<ul>
  <li><strong>Array-based structure</strong> ensures deterministic serialization across JSON implementations</li>
  <li><strong>Timestamp validation</strong> with 60-second expiry prevents replay attacks</li>
  <li><strong>Session-based routing</strong> via <code>AppSessionID</code> for virtual application isolation</li>
  <li><strong>Challenge-response authentication</strong> using EIP-712 structured signing</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>How does signature verification work across different chains?</strong></summary>
  <div>
    <p>Nitrolite uses <strong>chain-agnostic signature verification</strong> without EIP-191 prefixing:</p>

```go
// Raw ECDSA signing without chain-specific prefixes
messageHash := crypto.Keccak256Hash(stateBytes)
signature, _ := crypto.Sign(messageHash.Bytes(), privateKey)
```

<p><strong>Implementation Details:</strong></p>
<ul>
  <li><strong>ECDSA with secp256k1</strong> curve (Ethereum-compatible)</li>
  <li><strong>Keccak256 hashing</strong> for message digests</li>
  <li><strong>65-byte signature format</strong> (r,s,v) with v adjustment</li>
  <li><strong>Address recovery</strong> using <code>crypto.SigToPub()</code> for authentication</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>What is the channel state encoding format?</strong></summary>
  <div>
    <p>States are ABI-encoded with a specific structure:</p>

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

<p><strong>Intent Types:</strong></p>
<ul>
  <li><code>OPERATE(0)</code>: Normal application states</li>
  <li><code>INITIALIZE(1)</code>: Channel funding states</li>
  <li><code>RESIZE(2)</code>: Capacity adjustment states</li>
  <li><code>FINALIZE(3)</code>: Channel closing states</li>
</ul>

  </div>
</details>

## Virtual Ledger System

<details>
  <summary><strong>How does the double-entry accounting work?</strong></summary>
  <div>
    <p>ClearNode implements traditional double-entry bookkeeping with DECIMAL(64,18) precision:</p>

```sql
CREATE TABLE ledger_entries (
    account_id VARCHAR NOT NULL,
    wallet VARCHAR NOT NULL,
    asset_symbol VARCHAR NOT NULL,
    credit DECIMAL(64,18) NOT NULL,
    debit DECIMAL(64,18) NOT NULL
);
```

<p><strong>Balance Calculation:</strong></p>

```go
// Balance = SUM(credit) - SUM(debit) for each (wallet, asset) pair
balance := totalCredits.Sub(totalDebits)
```

<p><strong>Account Types:</strong></p>
<ul>
  <li><strong>Participant accounts</strong>: User wallet balances</li>
  <li><strong>Virtual app accounts</strong>: Isolated application contexts</li>
  <li><strong>System accounts</strong>: Protocol-level operations</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>How do virtual applications achieve consensus?</strong></summary>
  <div>
    <p>Virtual apps use <strong>weighted quorum-based consensus</strong> configured during channel creation:</p>

```go
// Check if combined signature weights meet quorum threshold
if totalWeight < int64(appSession.Quorum) {
    return fmt.Errorf("quorum not met: %d / %d", totalWeight, appSession.Quorum)
}
```

<p><strong>Weight Configuration:</strong></p>

```go
type App struct {
    Participants []address  // Array of participants in the app
    Weights      []uint8    // Signers weights [50, 50, 80, 20, 20]
    Quorum       uint64     // Example: 100 would be the signature threshold
}
```

<p><strong>Consensus Flow:</strong></p>
<ol>
  <li><strong>State proposal</strong> by any participant</li>
  <li><strong>Signature collection</strong> from participants until weight threshold met</li>
  <li><strong>Validation</strong> of weighted quorum achievement</li>
  <li><strong>Ledger update</strong> with atomic balance transfers</li>
</ol>

<p><strong>Example Scenarios:</strong></p>
<ul>
  <li><strong>Simple majority</strong>: Weights [50, 50], Quorum 51</li>
  <li><strong>Supermajority</strong>: Weights [25, 25, 25, 25], Quorum 75</li>
  <li><strong>Dictator + veto</strong>: Weights [80, 20], Quorum 100</li>
</ul>

  </div>
</details>

## Security Model

<details>
  <summary><strong>How does challenge/response dispute resolution work?</strong></summary>
  <div>
    <p>The system uses <strong>optimistic execution</strong> with challenge periods:</p>

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

<p><strong>Security Guarantees:</strong></p>
<ul>
  <li><strong>Economic security</strong>: Funds locked in custody contracts</li>
  <li><strong>Temporal security</strong>: Challenge periods prevent hasty closures</li>
  <li><strong>Cryptographic security</strong>: All state transitions require valid signatures</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>How do session keys work?</strong></summary>
  <div>
    <p>Session keys enable <strong>delegation without custody transfer</strong>:</p>

```go
// NOTE: it is allowed for depositor (and wallet) to be different from channel creator (participant)
// This enables logic of "session keys" where a user can create a channel on behalf of another account
```

<p><strong>Implementation:</strong></p>
<ul>
  <li><strong>Signer mapping</strong>: <code>signers</code> table maps session keys to wallet addresses</li>
  <li><strong>Authentication flow</strong>: EIP-712 structured signing for challenge-response</li>
  <li><strong>Session management</strong>: 24-hour TTL with renewal capability</li>
  <li><strong>Scope limitation</strong>: Session keys cannot withdraw funds, only sign state updates</li>
</ul>

  </div>
</details>

## Performance and Scaling

<details>
  <summary><strong>What are the performance bottlenecks?</strong></summary>
  <div>

<p><strong>Identified Constraints:</strong></p>
<ul>
  <li><strong>Single WebSocket per wallet</strong>: Limits concurrent connections</li>
  <li><strong>Synchronous signature verification</strong>: CPU-bound operation for each message</li>
  <li><strong>Database balance queries</strong>: Not cached, requires computation</li>
  <li><strong>Memory-based sessions</strong>: Cannot distribute across multiple ClearNode instances</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>How does multi-chain asset handling work?</strong></summary>
  <div>
    <p>Each token-chain combination is treated as a distinct asset:</p>

```go
type Asset struct {
    Token    string `gorm:"column:token;primaryKey"`
    ChainID  uint32 `gorm:"column:chain_id;primaryKey"` 
    Symbol   string `gorm:"column:symbol;not null"`
    Decimals uint8  `gorm:"column:decimals;not null"`
}
```

<p><strong>Precision Handling:</strong></p>
<ul>
  <li><strong>Consistent DECIMAL(64,18)</strong> across all monetary calculations</li>
  <li><strong>Chain-specific decimals</strong> stored per asset</li>
  <li><strong>Token address normalization</strong> per chain</li>
  <li><strong>Independent custody contracts</strong> per supported chain</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>How does the system prevent replay attacks?</strong></summary>
  <div>

<p><strong>Multi-layer Protection:</strong></p>
<ul>
  <li><strong>Timestamp validation</strong>: Messages expire after 60 seconds</li>
  <li><strong>State version monotonicity</strong>: Version numbers must strictly increase</li>
  <li><strong>Nonce progression</strong>: Channel nonces prevent duplicate operations</li>
  <li><strong>Challenge periods</strong>: Time-locked dispute resolution</li>
</ul>

  </div>
</details>

## Integration Considerations

<details>
  <summary><strong>How do you handle WebSocket connection management?</strong></summary>
  <div>

<p><strong>Connection Lifecycle:</strong></p>

```go
// Authentication-first connection establishment
func (h *UnifiedWSHandler) authenticateConnection(ws *websocket.Conn) error {
    // Challenge-response authentication
    // Session token generation
    // Connection registration per wallet
}
```

<p><strong>Features:</strong></p>
<ul>
  <li><strong>One connection per wallet</strong>: Latest connection replaces previous</li>
  <li><strong>Message forwarding</strong>: Based on app session participants</li>
  <li><strong>Graceful error handling</strong>: Structured error responses</li>
  <li><strong>Metrics tracking</strong>: Connections, messages, auth events</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>What database schema optimizations are recommended?</strong></summary>
  <div>

<p><strong>Critical Indexes:</strong></p>

```sql
-- Balance calculation optimization
CREATE INDEX idx_ledger_wallet_asset ON ledger_entries(wallet, asset_symbol);

-- Channel lookup optimization  
CREATE INDEX idx_channels_participant ON channels(participant);

-- Session routing optimization
CREATE INDEX idx_app_sessions_participants ON app_sessions USING gin(participants);
```

<p><strong>Schema Considerations:</strong></p>
<ul>
  <li><strong>DECIMAL precision</strong>: Use DECIMAL(64,18) for all monetary values</li>
  <li><strong>UUID vs incremental IDs</strong>: UUIDs for app sessions, incremental for performance-critical tables</li>
  <li><strong>Partitioning</strong>: Consider partitioning ledger_entries by time for large deployments</li>
</ul>

  </div>
</details>

<details>
  <summary><strong>How do you implement custom adjudicators?</strong></summary>
  <div>
    <p>Custom adjudicators must implement the <code>IAdjudicator</code> interface:</p>

```solidity
interface IAdjudicator {
    function adjudicate(
        Channel calldata chan, 
        State calldata candidate, 
        State[] calldata proofs
    ) external view returns (bool valid);
}
```

<p><strong>Implementation Patterns:</strong></p>
<ul>
  <li><strong>Stateless validation</strong>: Pure functions based on provided proofs</li>
  <li><strong>State transition rules</strong>: Validate moves from previous to current state</li>
  <li><strong>Business logic</strong>: Game rules, payment conditions, etc.</li>
  <li><strong>Proof requirements</strong>: Define what constitutes valid state transitions</li>
</ul>

  </div>
</details>

---

For additional technical details, consult the [Architecture Overview](architecture/) or examine the [ClearNode source code](https://github.com/erc7824/nitrolite/tree/main/clearnode).
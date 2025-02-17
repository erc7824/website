# FAQ

### Comprehensive FAQ: ERC-7824, State Channels

<details>
  <summary><strong>What is ERC-7824?</strong></summary>
  <p>
    ERC-7824 is a proposed standard for cross-chain trade execution systems that use state channels. It defines structures and interfaces to enable efficient, secure, and scalable off-chain interactions while leveraging the blockchain for finality and dispute resolution.
  </p>
</details>

<details>
  <summary><strong>What is a state channel?</strong></summary>
  <p>
    A state channel can be thought of as an account with multiple balances (often just two). The owners of that account can update those balances according to predefined rules, which are enforceable on a blockchain. This enables peer-to-peer games, payments, and other few-user applications to safely trade blockchain assets with extremely low latency, low cost, and high throughput without requiring trust in a third party.
  </p>
</details>

<details>
  <summary><strong>How do state channels work?</strong></summary>
  <p>
    1. **Setup:** Participants lock assets into a blockchain-based smart contract.<br/>
    2. **Off-Chain Updates:** Transactions or updates occur off-chain through cryptographically signed messages.<br/>
    3. **Finalization:** The final state is submitted on-chain for settlement, or disputes are resolved if necessary.
  </p>
</details>

<details>
  <summary><strong>What are the benefits of state channels?</strong></summary>
  <p>
    - **High Performance:** Transactions are processed off-chain, providing low latency and high throughput.<br/>
    - **Cost Efficiency:** Minimal blockchain interactions significantly reduce gas fees.<br/>
    - **Privacy:** Off-chain interactions keep intermediate states confidential.<br/>
    - **Flexibility:** Supports a wide range of applications, including multi-chain trading.
  </p>
</details>

<details>
  <summary><strong>What kind of applications use state channels?</strong></summary>
  <p>
    State channels enable the redistribution of assets according to arbitrary logic, making them suitable for:
    <ul>
      <li><strong>Games:</strong> Peer-to-peer poker or other interactive games.</li>
      <li><strong>Payments:</strong> Microtransactions and conditional payments.</li>
      <li><strong>Swaps:</strong> Atomic swaps between assets.</li>
      <li><strong>Decentralized Trading:</strong> Real-time, high-frequency trading applications.</li>
    </ul>
  </p>
</details>

<details>
  <summary><strong>How is Nitro Protocol implemented?</strong></summary>
  <p>
    - **On-Chain Components:** Implemented in Solidity and included in the npm package `@statechannels/nitro-protocol`.<br/>
    - **Off-Chain Components:** A reference implementation provided through `go-nitro`, a lightweight client written in Go.
  </p>
</details>

<details>
  <summary><strong>Where is Nitro Protocol being used?</strong></summary>
  <p>
    The maintainers of Nitro Protocol are actively integrating it into the Filecoin Retrieval Market and the Filecoin Virtual Machine, enabling decentralized and efficient content distribution.
  </p>
</details>

<details>
  <summary><strong>What is the structure of a state in state channels?</strong></summary>
  <p>
    A state consists of:
    <ol>
      <li><strong>Fixed Part:</strong> Immutable properties like participants, nonce, app definition, and challenge duration.</li>
      <li><strong>Variable Part:</strong> Changeable properties like outcomes, application data, and turn numbers.</li>
    </ol>
  </p>
</details>

<details>
  <summary><strong>What is a challenge duration?</strong></summary>
  <p>
    The challenge duration is a time window during which disputes can be raised on-chain. If no disputes are raised, the state channel finalizes according to its latest agreed state.
  </p>
</details>

<details>
  <summary><strong>How do disputes get resolved in state channels?</strong></summary>
  <p>
    Participants can:
    <ol>
      <li>Submit signed updates to the blockchain as evidence.</li>
      <li>Resolve disputes based on turn numbers and application-specific rules.</li>
      <li>Finalize the channel after the challenge duration if no valid disputes arise.</li>
    </ol>
  </p>
</details>
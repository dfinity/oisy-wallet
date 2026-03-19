## Tip flow (MVP)

The tip flow is a simple **YES/YES escrow flow**:

- the payer creates and funds a tip deal
- the recipient receives a QR code or link containing the `deal_id` and `claim_code`
- if the recipient signs up, provides the correct claim code, and accepts before expiry, the funds are released
- if the recipient never claims the tip, the funds are refunded after the deadline

### Claim code

Every deal gets a **cryptographically random 128-bit claim code** (generated via `raw_rand`). For open (unbound-recipient) deals, this code must be provided in `accept_deal` to authorize the fund release. The claim code is:

- Returned to the creator in the `DealView` after `create_deal`
- **Never** exposed via `get_claimable_deal` (the public preview endpoint)
- Encoded in the QR code / share link alongside the `deal_id`
- Not required when the recipient's principal is already bound to the deal

### Consent

For tips, consent is handled implicitly:

- **Payer consent** → automatically `Accepted` at creation (the payer initiated the tip)
- **Recipient consent** → automatically `Accepted` when the recipient claims (`accept_deal`)

For two-party deals where both parties are known upfront, both must explicitly consent via `consent_deal` before funding can proceed.

### Expiry & Refund Mechanism

Refunds after expiry can be handled in two ways (implementation choice):

- **Manual reclaim (lazy execution)**
  - the payer explicitly calls `reclaim(deal_id)` after expiry
  - simplest and safest MVP approach

- **Automatic refund (cron / heartbeat)**
  - the escrow canister periodically scans expired deals
  - automatically refunds without user interaction

Both approaches can coexist: cron for convenience, manual reclaim as fallback.

> [!WARNING]
> All funding, settlement, and refund operations **must be idempotent**.
> This prevents double execution in case of retries, race conditions, or partial failures.

---

# Sequence Diagram (idiomatic)

```mermaid
sequenceDiagram
    participant P as Payer (User A)
    participant F as Frontend (OISY)
    participant E as Escrow Canister
    participant L as Token Ledger (ICRC)
    participant R as Recipient (User B)

    %% --- CREATE DEAL ---
    P->>F: Start tip flow
    F->>E: create_deal(amount, expiry, payee?)
    E->>E: generate claim_code via raw_rand
    E-->>F: deal_id + escrow_subaccount + claim_code

    %% --- FUNDING ---
    P->>L: approve(E, amount)
    F->>E: fund_deal(deal_id)
    E->>L: transfer_from(P -> escrow_subaccount)
    E-->>F: status = FUNDED

    %% --- SHARE ---
    F->>P: Show QR / link (deal_id + claim_code)

    %% --- CLAIM ---
    R->>F: Open QR / link
    F->>E: get_claimable_deal(deal_id)
    F->>R: Show tip preview, prompt login / signup

    R->>F: accept_deal(deal_id, claim_code)
    F->>E: accept_deal(deal_id, claim_code)

    %% --- BIND RECIPIENT ---
    E->>E: bind recipient if not set, set recipient_consent = Accepted

    %% --- SETTLEMENT ---
    E->>L: transfer(escrow_subaccount -> R)
    E-->>F: status = SETTLED

    %% --- EXPIRY PATH ---
    alt Not claimed before expiry
        opt Manual reclaim
            P->>F: reclaim(deal_id)
            F->>E: reclaim(deal_id)
        end
        opt Cron / heartbeat
            E->>E: detect expired deal
        end
        E->>L: transfer(escrow_subaccount -> P)
        E-->>F: status = REFUNDED
    end
```

---

# Two-party deal flow

```mermaid
sequenceDiagram
    participant A as Party A (Creator)
    participant F as Frontend
    participant E as Escrow Canister
    participant L as Token Ledger
    participant B as Party B (Counterparty)

    %% --- CREATE ---
    A->>F: Create deal with B as counterparty
    F->>E: create_deal(amount, expiry, payer=A, recipient=B)
    E-->>F: deal_id (A consent = Accepted, B consent = Pending)

    %% --- CONSENT ---
    B->>F: View deal details
    F->>E: get_deal(deal_id)
    B->>F: Accept deal terms
    F->>E: consent_deal(deal_id)
    E-->>F: B consent = Accepted

    %% --- FUNDING ---
    A->>L: approve(E, amount)
    F->>E: fund_deal(deal_id)
    E->>L: transfer_from(A -> escrow_subaccount)
    E-->>F: status = FUNDED

    %% --- SETTLEMENT ---
    B->>F: Claim deal
    F->>E: accept_deal(deal_id)
    E->>L: transfer(escrow_subaccount -> B)
    E-->>F: status = SETTLED
```

---

# Flowchart

```mermaid
flowchart TD
    A[Creator opens deal flow in frontend] --> B[Create deal in Escrow canister]
    B --> C[Escrow returns deal_id, claim_code, and expiry]
    C --> D{Is counterparty known?}

    D -- Yes --> E[Counterparty consents via consent_deal]
    D -- No --> F[Payer approves token spend via ICRC-2]

    E --> F
    F --> G[Escrow canister transfer_from payer into deal subaccount]
    G --> H[Deal status = Funded]

    H --> I[Frontend shows QR code / share link with deal_id + claim_code]
    I --> J[Recipient opens link or scans QR]

    J --> K{Recipient already has an account?}
    K -- Yes --> L[Recipient authenticates]
    K -- No --> M[Recipient signs up / creates account]
    M --> L

    L --> N[Recipient claims / accepts deal with claim_code]
    N --> O[Escrow binds recipient principal + sets consent = Accepted]
    O --> P[Escrow transfers funds to recipient]
    P --> Q[Deal status = Settled]

    H --> R{Expiry reached before claim?}
    R -- No --> J
    R -- Yes --> S{Refund mechanism}
    S -- Manual --> T[Payer calls reclaim]
    S -- Cron --> U[Canister detects expiry]
    T --> V[Escrow refunds payer]
    U --> V
    V --> W[Deal status = Refunded]
```

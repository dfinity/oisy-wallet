## Tip flow (MVP)

The tip flow is a simple **YES/YES escrow flow**:

- the payer creates and funds a tip deal
- the recipient receives a QR code or link
- if the recipient signs up and accepts before expiry, the funds are released
- if the recipient never claims the tip, the payer gets refunded after the deadline

---

# 🧾 Sequence Diagram (idiomatic)

```mermaid
sequenceDiagram
    participant P as Payer (User A)
    participant F as Frontend
    participant E as Escrow Canister
    participant L as Token Ledger (ICRC-1/2)
    participant R as Recipient (User B)

    %% --- CREATE DEAL ---
    P->>F: Start tip flow
    F->>E: create_deal(amount, expiry, payee?)
    E-->>F: deal_id + escrow_subaccount

    %% --- FUNDING ---
    P->>L: approve(E, amount)
    F->>E: fund_deal(deal_id)
    E->>L: transfer_from(P -> escrow_subaccount)
    E-->>F: status = FUNDED

    %% --- SHARE ---
    F->>P: Show QR / link (deal_id)

    %% --- CLAIM ---
    R->>F: Open QR / link
    F->>E: get_deal(deal_id)
    F->>R: Prompt login / signup

    R->>F: accept_deal(deal_id)
    F->>E: accept_deal(deal_id)

    %% --- BIND RECIPIENT ---
    E->>E: bind recipient if not set

    %% --- SETTLEMENT ---
    E->>L: transfer(escrow_subaccount -> R)
    E-->>F: status = COMPLETED

    %% --- EXPIRY PATH ---
    alt Not claimed before expiry
        P->>F: reclaim(deal_id)
        F->>E: reclaim(deal_id)
        E->>L: transfer(escrow_subaccount -> P)
        E-->>F: status = REFUNDED
    end
```

---

# 🧾 Flowchart (not-idiomatic)

Same thing but with a different chart type.

```mermaid
flowchart TD
    A[Payer opens tip flow in frontend] --> B[Create tip deal in Escrow canister]
    B --> C[Escrow canister returns deal_id and expiry]
    C --> D[Payer approves token spend via ICRC-2]
    D --> E[Escrow canister transfer_from payer into deal subaccount]
    E --> F[Deal status = Funded]

    F --> G[Frontend shows QR code / share link with deal_id]
    G --> H[Recipient opens link or scans QR]

    H --> I{Recipient already has an account?}
    I -- Yes --> J[Recipient authenticates]
    I -- No --> K[Recipient signs up / creates account]
    K --> J

    J --> L[Recipient claims / accepts tip]
    L --> M[Escrow canister binds recipient principal if needed]
    M --> N[Escrow canister transfers funds to recipient]
    N --> O[Deal status = Completed]

    F --> P{Expiry reached before claim?}
    P -- No --> H
    P -- Yes --> Q[Payer calls reclaim or cleanup is triggered]
    Q --> R[Escrow canister refunds payer]
    R --> S[Deal status = Refunded]
```

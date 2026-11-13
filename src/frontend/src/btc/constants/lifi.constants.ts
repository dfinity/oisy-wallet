// LI.FI's token address for native BTC, on its Bitcoin chain (`ChainId.BTC`).
export const LIFI_BTC_TOKEN_ADDRESS = 'bitcoin';

// The smallest amount LI.FI is asked to quote from BTC, in satoshis: ⌈294 / `LIFI_FEE_BPS`⌉. LI.FI's
// fee output never goes below 294 sats, the P2WPKH dust limit, while its quote still lists 25 bps of
// the amount (2026-11-13), so below this amount the fee paid would exceed the fee quoted.
export const LIFI_BTC_MIN_AMOUNT_SATOSHIS = 117_600n;

// LI.FI's fee address on Bitcoin: the fee output of every quote, through every bridge, on
// 2026-11-02 and 2026-11-13. Pinned, never taken from a quote: a quote paying its fee elsewhere is
// refused.
export const LIFI_BTC_FEE_ADDRESS = 'bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g';

// The name of LI.FI's own fee among a BTC quote's `feeCosts`, the amount its fee output pays.
export const LIFI_BTC_FEE_COST_NAME = 'LIFI Fixed Fee';

// The longest `OP_RETURN` script the backend broadcasts: the opcode and 80 bytes of data with their
// push opcodes (`MAX_OP_RETURN_SCRIPT_BYTES` in `src/backend/src/bitcoin/tx_validator.rs`).
export const LIFI_BTC_MAX_MEMO_SCRIPT_BYTES = 83;

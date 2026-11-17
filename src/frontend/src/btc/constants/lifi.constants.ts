// LI.FI's token address for native BTC, on its Bitcoin chain (`ChainId.BTC`).
export const LIFI_BTC_TOKEN_ADDRESS = 'bitcoin';

// The smallest fee output the backend broadcasts to LI.FI's fee address, in satoshis: the dust limit
// of a P2WPKH output (`minimal_non_dust` in `src/backend/src/bitcoin/tx_validator.rs`).
export const LIFI_BTC_MIN_FEE_SATOSHIS = 294n;

// The smallest amount LI.FI is asked to quote from BTC, in satoshis:
// ⌈`LIFI_BTC_MIN_FEE_SATOSHIS` / `LIFI_FEE_BPS`⌉. LI.FI's fee output never goes below 294 sats,
// while its quote still lists 25 bps of the amount (2026-11-13), so below this amount the fee paid
// would exceed the fee quoted.
export const LIFI_BTC_MIN_AMOUNT_SATOSHIS = 117_600n;

// LI.FI's fee address on Bitcoin: the fee output of every quote, through every bridge, on
// 2026-11-02 and 2026-11-13. Pinned, never taken from a quote: a quote paying its fee elsewhere is
// refused.
export const LIFI_BTC_FEE_ADDRESS = 'bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g';

// The name of LI.FI's own fee among a BTC quote's `feeCosts`, the amount its fee output pays.
export const LIFI_BTC_FEE_COST_NAME = 'LIFI Fixed Fee';

// Where OISY's rebuild of a LI.FI transaction puts the change: between LI.FI's memo and its fee
// output, where LI.FI's own PSBT has it.
export const LIFI_BTC_CHANGE_INDEX = 2;

// Every input's sequence in LI.FI's PSBTs, kept in the rebuild: replaceable, with relative lock-time
// disabled, which the backend's validator accepts.
export const LIFI_BTC_SEQUENCE = 0xfffffffd;

// LI.FI's largest output layout from BTC, without the change, in vbytes: the largest deposit output
// (`BTC_LARGEST_OUTPUT_VSIZE`), an `OP_RETURN` at `LIFI_BTC_MAX_MEMO_SCRIPT_BYTES` (9 + 83) and
// LI.FI's P2WPKH fee output (9 + 22). Max is budgeted for it before a LI.FI quote prices its own.
export const LIFI_BTC_CONSERVATIVE_OUTPUT_VSIZES = [43, 92, 31];

// The longest `OP_RETURN` script the backend broadcasts: the opcode and 80 bytes of data with their
// push opcodes (`MAX_OP_RETURN_SCRIPT_BYTES` in `src/backend/src/bitcoin/tx_validator.rs`).
export const LIFI_BTC_MAX_MEMO_SCRIPT_BYTES = 83;

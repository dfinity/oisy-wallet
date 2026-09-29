// The CMC treats a deposit as a mint only when its memo is `MINT` (0x544e494d).
// An ICRC-1 transfer carries it as an 8-byte little-endian `icrc1_memo`, which
// the CMC reads whenever the legacy memo is zero.
export const CMC_MINT_CYCLES_MEMO = new Uint8Array([0x4d, 0x49, 0x4e, 0x54, 0, 0, 0, 0]);

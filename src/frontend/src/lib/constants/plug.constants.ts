/**
 * Plug's Chain Fusion helper canister.
 *
 * Plug derives only its IC identity from the seed phrase. Its BTC, EVM and SOL
 * addresses are chain-key (threshold) keys held by this canister and addressed
 * by the user's principal — the same shape OISY uses with the
 * chain-fusion-signer, rooted in a different canister. Because the canister id
 * is the first component of the derivation path, it is what makes Plug's
 * addresses differ from OISY's for the very same principal.
 */
export const PLUG_HELPER_CANISTER_ID = 'ajx4k-liaaa-aaaal-ajqfq-cai';

/**
 * Plug's BIP32 path prefix for the IC identity. The account index is appended:
 * Plug's `addAccount(n)` derives `m/44'/223'/0'/0/{n}`, so each additional Plug
 * account is a new index here — a different principal, and therefore a
 * different set of chain-key addresses.
 */
export const PLUG_IC_DERIVATION_PATH_PREFIX = "m/44'/223'/0'/0";

/**
 * Highest account index the import scans. The user chooses the depth; Plug
 * itself has no hard cap, but scanning is one derivation plus one balance
 * lookup per account per network, so the range stays small.
 */
export const PLUG_MAX_ACCOUNT_INDEX = 9;

/**
 * Path component Plug inserts between the canister id and the principal when
 * deriving the EVM key. BTC and SOL use no discriminator at all — the byte is
 * chosen by the signing canister and cannot be inferred (OISY's own signer, for
 * comparison, uses 0x01 for ETH and 0xfe for SOL).
 */
export const PLUG_EVM_PATH_DISCRIMINATOR = 0x01;

/**
 * Chain-key derivation starts from a zero chain code, as in
 * `$lib/ic-pub-key/src/cli.ts`.
 */
export const PLUG_ZERO_CHAIN_CODE = '0'.repeat(64);

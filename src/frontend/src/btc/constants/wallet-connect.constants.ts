import type { EcdsaKeyId } from '$declarations/signer/signer.did';
import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';

// Bitcoin (bip122) methods — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export const SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES = 'getAccountAddresses';
export const SESSION_REQUEST_BTC_SIGN_MESSAGE = 'signMessage';
export const SESSION_REQUEST_BTC_SIGN_PSBT = 'signPsbt';

export const BTC_ECDSA_KEY_ID: EcdsaKeyId = {
	curve: { secp256k1: null },
	name: SIGNER_ROOT_KEY_NAME
};

// Note: derivation path passed to `generic_sign_with_ecdsa` to reproduce the key behind the
// caller's P2WPKH address. OISY derives that address with the schema byte `0x00` (see
// `deriveBtcAddress`), and chain-fusion-signer applies the caller principal context itself, so the
// only application-level component we supply is that schema byte. The recovery step in
// `encodeRecoverableSignature` is the guardrail: if this path is wrong the recovered public key
// will not match and we throw instead of returning a bad signature.
export const BTC_ECDSA_DERIVATION_PATH: string[] = ['\x00'];

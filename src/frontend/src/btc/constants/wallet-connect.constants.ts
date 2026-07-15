import type { EcdsaKeyId } from '$declarations/signer/signer.did';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';
import type { NetworkId } from '$lib/types/network';

// Bitcoin (bip122) methods — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export const SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES = 'getAccountAddresses';
export const SESSION_REQUEST_BTC_SIGN_MESSAGE = 'signMessage';
export const SESSION_REQUEST_BTC_SIGN_PSBT = 'signPsbt';
export const SESSION_REQUEST_BTC_ADDRESSES_CHANGED = 'bip122_addressesChanged';

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

// BIP-84 path of the address OISY advertises to dApps via `getAccountAddresses`. OISY uses the
// first external Native SegWit (P2WPKH) address. The BIP-44 coin type is network-aware: `0'` for
// Bitcoin mainnet and `1'` for any test network (testnet/regtest), per SLIP-44. This is only the
// descriptor surfaced to the dApp; the actual key derivation on the signer uses
// `BTC_ECDSA_DERIVATION_PATH` (the value here is not the signer input).
const BTC_WALLET_CONNECT_DERIVATION_PATH_MAINNET = "m/84'/0'/0'/0/0";
const BTC_WALLET_CONNECT_DERIVATION_PATH_TESTNET = "m/84'/1'/0'/0/0";

export const btcWalletConnectDerivationPath = ({ networkId }: { networkId: NetworkId }): string =>
	networkId === BTC_MAINNET_NETWORK_ID
		? BTC_WALLET_CONNECT_DERIVATION_PATH_MAINNET
		: BTC_WALLET_CONNECT_DERIVATION_PATH_TESTNET;

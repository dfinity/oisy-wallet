import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import type { NetworkId } from '$lib/types/network';

// Bitcoin (bip122) methods — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export const SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES = 'getAccountAddresses';
export const SESSION_REQUEST_BTC_SIGN_MESSAGE = 'signMessage';
export const SESSION_REQUEST_BTC_SIGN_PSBT = 'signPsbt';
export const SESSION_REQUEST_BTC_ADDRESSES_CHANGED = 'bip122_addressesChanged';

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

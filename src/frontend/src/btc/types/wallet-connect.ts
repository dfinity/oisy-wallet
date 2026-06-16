export interface WalletConnectBtcApproveRequestMessage {
	signature: string;
	address: string;
}

// Reown bitcoin `getAccountAddresses` returns a list of address descriptors —
// https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc#getaccountaddresses
export interface WalletConnectBtcAccountAddress {
	address: string;
	publicKey: string;
	// BIP-84 path of the returned address. OISY exposes the first external Native SegWit (P2WPKH)
	// address; the coin type is network-aware (`m/84'/0'/0'/0/0` on mainnet, `m/84'/1'/0'/0/0` on
	// test networks).
	path: string;
	// Reown's address intention. OISY exposes a single P2WPKH address used both to receive and to
	// pay, so it is advertised with the `payment` intention.
	intention: 'payment' | 'ordinal';
}

export type WalletConnectBtcAccountAddresses = WalletConnectBtcAccountAddress[];

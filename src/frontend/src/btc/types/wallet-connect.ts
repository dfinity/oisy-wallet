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

export interface WalletConnectBtcDecodedPsbtInput {
	address: string | undefined;
	// Undefined when the input carries no `witnessUtxo` and its value is therefore unknown; it must
	// NOT be conflated with a zero-value input in the review.
	value: bigint | undefined;
	// Whether this input belongs to the wallet's own P2WPKH address and will be signed.
	signedByWallet: boolean;
}

export interface WalletConnectBtcDecodedPsbtOutput {
	address: string | undefined;
	value: bigint;
}

export interface WalletConnectBtcDecodedPsbt {
	inputs: WalletConnectBtcDecodedPsbtInput[];
	outputs: WalletConnectBtcDecodedPsbtOutput[];
	// Sum of the values of the wallet-owned inputs that will be signed. This is the gross signed input
	// value, NOT the net spend (it ignores any change returned to the wallet).
	totalSignedInputs: bigint;
	// Sum(inputs) - sum(outputs); undefined when an input is missing its UTXO value.
	fee: bigint | undefined;
	broadcast: boolean;
}

// Reown bitcoin `signPsbt` response — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export interface WalletConnectBtcApproveSignPsbtMessage {
	psbt: string;
	txid?: string;
}

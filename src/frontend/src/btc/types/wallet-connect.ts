export interface WalletConnectBtcApproveRequestMessage {
	signature: string;
	address: string;
}

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

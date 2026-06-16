export interface WalletConnectBtcApproveRequestMessage {
	signature: string;
	address: string;
}

export interface WalletConnectBtcDecodedPsbtInput {
	address: string | undefined;
	value: bigint;
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
	// Total value of the inputs the wallet is being asked to sign (the user's own spend).
	totalSpend: bigint;
	// Sum(inputs) - sum(outputs); undefined when an input is missing its UTXO value.
	fee: bigint | undefined;
	broadcast: boolean;
}

// Reown bitcoin `signPsbt` response — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export interface WalletConnectBtcApproveSignPsbtMessage {
	psbt: string;
	txid?: string;
}

import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';

export interface UtxoSelectionParams {
	identity: OptionIdentity;
	address: string;
	network: BitcoinNetwork;
	amountSatoshis: bigint;
	minConfirmations?: number;
	minterCanisterId: CanisterIdText;
}

export interface UtxoSelectionResult {
	selectedUtxos: Utxo[];
	totalInputValue: bigint;
	changeAmount: bigint;
}

export interface UtxoFilterOptions {
	minConfirmations?: number;
	excludeTxIds?: string[]; // UTXOs to exclude (from pending transactions)
}

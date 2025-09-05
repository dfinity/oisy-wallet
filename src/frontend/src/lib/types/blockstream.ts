import type { BtcAddress } from '$lib/types/address';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

interface BlockstreamTxStatus {
	confirmed: boolean;
	block_height?: number;
	block_hash?: string;
	block_time?: number;
}

interface BlockstreamVin {
	txid: string;
	vout: number;
	prevout?: {
		scriptpubkey: string;
		scriptpubkey_asm: string;
		scriptpubkey_type: string;
		scriptpubkey_address?: string;
		value: number;
	};
	scriptsig: string;
	scriptsig_asm: string;
	witness: string[];
	is_coinbase: boolean;
	sequence: number;
}

interface BlockstreamVout {
	scriptpubkey: string;
	scriptpubkey_asm: string;
	scriptpubkey_type: string;
	scriptpubkey_address?: string;
	value: number;
}

export interface BlockstreamTransaction {
	txid: string;
	version: number;
	locktime: number;
	vin: BlockstreamVin[];
	vout: BlockstreamVout[];
	size: number;
	weight: number;
	fee: number;
	status: BlockstreamTxStatus;
}

export interface BlockstreamBtcAddressTxsParams {
	btcAddress: BtcAddress;
	bitcoinNetwork: BitcoinNetwork;
}

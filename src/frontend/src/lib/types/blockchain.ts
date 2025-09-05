import type { BtcAddress } from '$lib/types/address';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

interface SpendingOutpoint {
	tx_index: number;
	n: number;
}

export interface BitcoinOutput {
	type: number;
	spent: boolean;
	value: number;
	spending_outpoints: SpendingOutpoint[];
	n: number;
	tx_index: number;
	script: string;
	addr: string;
}

interface BitcoinPrevOut {
	type: number;
	spent: boolean;
	value: number;
	spending_outpoints: SpendingOutpoint[];
	n: number;
	tx_index: number;
	script: string;
	addr: string;
}

interface BitcoinInput {
	sequence: number;
	witness: string;
	script: string;
	index: number;
	prev_out: BitcoinPrevOut;
}

export interface BitcoinTransaction {
	hash: string;
	ver: number;
	vin_sz: number;
	vout_sz: number;
	size: number;
	weight: number;
	fee: number;
	relayed_by: string;
	lock_time: number;
	tx_index: number;
	double_spend: boolean;
	time: number;
	block_index: number | null;
	block_height: number | null;
	inputs: BitcoinInput[];
	out: BitcoinOutput[];
	result: number;
	balance: number;
}

export interface BitcoinAddressData {
	hash160: string;
	address: string;
	n_tx: number;
	n_unredeemed: number;
	total_received: number;
	total_sent: number;
	final_balance: number;
	txs: BitcoinTransaction[];
}

export interface BlockchainBtcAddressDataParams {
	btcAddress: BtcAddress;
	bitcoinNetwork: BitcoinNetwork;
}

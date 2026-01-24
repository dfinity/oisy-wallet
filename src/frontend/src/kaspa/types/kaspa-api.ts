/**
 * Types for Kaspa REST API responses
 * API Documentation: https://api.kaspa.org/docs
 */

/**
 * Balance response from /addresses/{address}/balance
 */
export interface KaspaBalanceResponse {
	address: string;
	balance: number; // Balance in sompi (1 KAS = 100,000,000 sompi)
}

/**
 * Script public key object from Kaspa API
 */
export interface KaspaScriptPublicKey {
	scriptPublicKey: string;
	version?: number;
}

/**
 * UTXO entry from the Kaspa API
 */
export interface KaspaUtxoEntry {
	amount: string; // Amount in sompi as string
	scriptPublicKey: KaspaScriptPublicKey;
	blockDaaScore: string;
	isCoinbase: boolean;
}

/**
 * UTXO outpoint identifying a specific output
 */
export interface KaspaUtxoOutpoint {
	transactionId: string;
	index: number;
}

/**
 * Full UTXO object from /addresses/{address}/utxos
 */
export interface KaspaUtxo {
	address: string;
	outpoint: KaspaUtxoOutpoint;
	utxoEntry: KaspaUtxoEntry;
}

/**
 * UTXOs response from /addresses/{address}/utxos
 */
export type KaspaUtxosResponse = KaspaUtxo[];

/**
 * Transaction input
 */
export interface KaspaTransactionInput {
	previousOutpoint: KaspaUtxoOutpoint;
	signatureScript: string;
	sequence: string;
	sigOpCount: number;
}

/**
 * Transaction output
 */
export interface KaspaTransactionOutput {
	amount: string;
	scriptPublicKey: {
		scriptPublicKey: string;
	};
	verboseData?: {
		scriptPublicKeyType: string;
		scriptPublicKeyAddress: string;
	};
}

/**
 * Transaction from API response
 */
export interface KaspaTransaction {
	subnetworkId: string;
	transactionId: string;
	hash: string;
	mass: string;
	block_hash: string[];
	block_time: number;
	is_accepted: boolean;
	accepting_block_hash: string;
	accepting_block_blue_score: number;
	inputs: KaspaTransactionInput[];
	outputs: KaspaTransactionOutput[];
}

/**
 * Transaction submission request body
 */
export interface KaspaSubmitTransactionRequest {
	transaction: {
		version: number;
		inputs: Array<{
			previousOutpoint: {
				transactionId: string;
				index: number;
			};
			signatureScript: string;
			sequence: string;
			sigOpCount: number;
		}>;
		outputs: Array<{
			amount: string;
			scriptPublicKey: {
				scriptPublicKey: string;
				version: number;
			};
		}>;
		lockTime: string;
		subnetworkId: string;
	};
}

/**
 * Transaction submission response
 */
export interface KaspaSubmitTransactionResponse {
	transactionId: string;
}

/**
 * Virtual chain blue score (DAG info)
 */
export interface KaspaVirtualChainBlueScore {
	blueScore: string;
}

/**
 * Fee estimate response
 */
export interface KaspaFeeEstimate {
	priorityBucket: {
		feerate: number;
		estimatedSeconds: number;
	};
	normalBuckets: Array<{
		feerate: number;
		estimatedSeconds: number;
	}>;
	lowBuckets: Array<{
		feerate: number;
		estimatedSeconds: number;
	}>;
}

/**
 * Transaction history response for an address
 */
export interface KaspaAddressTransactionsResponse {
	address: string;
	transactions: KaspaTransaction[];
}

/**
 * Network info response
 */
export interface KaspaNetworkInfo {
	networkName: string;
	blockCount: string;
	headerCount: string;
	tipHashes: string[];
	virtualParentHashes: string[];
	difficulty: number;
	pastMedianTime: string;
	virtualDaaScore: string;
}

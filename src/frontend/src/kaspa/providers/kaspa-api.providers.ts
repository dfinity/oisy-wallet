/**
 * Kaspa REST API Provider
 *
 * Provides access to the public Kaspa API for:
 * - Balance queries
 * - UTXO fetching
 * - Transaction submission
 * - Fee estimation
 *
 * API Documentation: https://api.kaspa.org/docs
 */

import { KASPA_API_URL_MAINNET, KASPA_API_URL_TESTNET } from '$env/rest/kaspa.env';
import type { KaspaAddress } from '$kaspa/types/address';
import type {
	KaspaBalanceResponse,
	KaspaFeeEstimate,
	KaspaNetworkInfo,
	KaspaSubmitTransactionRequest,
	KaspaSubmitTransactionResponse,
	KaspaTransaction,
	KaspaUtxosResponse,
	KaspaVirtualChainBlueScore
} from '$kaspa/types/kaspa-api';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export type KaspaNetworkType = 'mainnet' | 'testnet';

/**
 * Get the API base URL for the specified network
 */
const getApiBaseUrl = (network: KaspaNetworkType): string => {
	const url = network === 'mainnet' ? KASPA_API_URL_MAINNET : KASPA_API_URL_TESTNET;

	assertNonNullish(
		url,
		replacePlaceholders(get(i18n).init.error.no_alchemy_config, {
			$network: `Kaspa ${network}`
		})
	);

	return url;
};

/**
 * Generic fetch wrapper with error handling
 */
const fetchKaspaApi = async <T>(url: string, options?: RequestInit): Promise<T> => {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		}
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => 'Unknown error');
		throw new Error(`Kaspa API error (${response.status}): ${errorText}`);
	}

	return response.json();
};

/**
 * Kaspa API Provider class
 */
export class KaspaApiProvider {
	private readonly baseUrl: string;

	constructor(private readonly network: KaspaNetworkType) {
		this.baseUrl = getApiBaseUrl(network);
	}

	/**
	 * Get the balance for an address
	 * Endpoint: GET /addresses/{address}/balance
	 *
	 * @returns Balance in sompi (1 KAS = 100,000,000 sompi)
	 */
	getBalance = async (address: KaspaAddress): Promise<bigint> => {
		const url = `${this.baseUrl}/addresses/${address}/balance`;
		const response = await fetchKaspaApi<KaspaBalanceResponse>(url);

		// Balance is returned as a number in sompi
		return BigInt(response.balance);
	};

	/**
	 * Get UTXOs for an address
	 * Endpoint: GET /addresses/{address}/utxos
	 */
	getUtxos = async (address: KaspaAddress): Promise<KaspaUtxosResponse> => {
		const url = `${this.baseUrl}/addresses/${address}/utxos`;
		return fetchKaspaApi<KaspaUtxosResponse>(url);
	};

	/**
	 * Get transactions for an address
	 * Endpoint: GET /addresses/{address}/full-transactions
	 *
	 * @param address - The Kaspa address
	 * @param limit - Maximum number of transactions to return (default: 50)
	 * @param offset - Offset for pagination (default: 0)
	 */
	getTransactions = async ({
		address,
		limit = 50,
		offset = 0
	}: {
		address: KaspaAddress;
		limit?: number;
		offset?: number;
	}): Promise<KaspaTransaction[]> => {
		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString()
		});
		const url = `${this.baseUrl}/addresses/${address}/full-transactions?${params}`;
		return fetchKaspaApi<KaspaTransaction[]>(url);
	};

	/**
	 * Get a specific transaction by ID
	 * Endpoint: GET /transactions/{transactionId}
	 */
	getTransaction = async (transactionId: string): Promise<KaspaTransaction | null> => {
		const url = `${this.baseUrl}/transactions/${transactionId}`;
		try {
			return await fetchKaspaApi<KaspaTransaction>(url);
		} catch (error) {
			// Return null if transaction not found
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	};

	/**
	 * Submit a signed transaction to the network
	 * Endpoint: POST /transactions
	 */
	submitTransaction = async (
		transaction: KaspaSubmitTransactionRequest
	): Promise<KaspaSubmitTransactionResponse> => {
		const url = `${this.baseUrl}/transactions`;
		return fetchKaspaApi<KaspaSubmitTransactionResponse>(url, {
			method: 'POST',
			body: JSON.stringify(transaction)
		});
	};

	/**
	 * Get current fee estimate
	 * Endpoint: GET /info/fee-estimate
	 */
	getFeeEstimate = async (): Promise<KaspaFeeEstimate> => {
		const url = `${this.baseUrl}/info/fee-estimate`;
		return fetchKaspaApi<KaspaFeeEstimate>(url);
	};

	/**
	 * Get the current virtual chain blue score (DAG tip)
	 * Endpoint: GET /info/virtual-chain-blue-score
	 */
	getVirtualChainBlueScore = async (): Promise<bigint> => {
		const url = `${this.baseUrl}/info/virtual-chain-blue-score`;
		const response = await fetchKaspaApi<KaspaVirtualChainBlueScore>(url);
		return BigInt(response.blueScore);
	};

	/**
	 * Get network info
	 * Endpoint: GET /info/network
	 */
	getNetworkInfo = async (): Promise<KaspaNetworkInfo> => {
		const url = `${this.baseUrl}/info/network`;
		return fetchKaspaApi<KaspaNetworkInfo>(url);
	};

	/**
	 * Check if an address has any transactions (useful for checking if address is used)
	 */
	hasTransactions = async (address: KaspaAddress): Promise<boolean> => {
		const url = `${this.baseUrl}/addresses/${address}/transactions-count`;
		try {
			const response = await fetchKaspaApi<{ total: number }>(url);
			return response.total > 0;
		} catch {
			// If endpoint fails, fall back to checking UTXOs
			const utxos = await this.getUtxos(address);
			return utxos.length > 0;
		}
	};
}

// Provider instances cache
const providers: Record<KaspaNetworkType, KaspaApiProvider | null> = {
	mainnet: null,
	testnet: null
};

/**
 * Get or create a KaspaApiProvider for the specified network
 */
export const getKaspaApiProvider = (network: KaspaNetworkType): KaspaApiProvider => {
	if (isNullish(providers[network])) {
		providers[network] = new KaspaApiProvider(network);
	}

	// We know it's not null because we just set it above
	return providers[network]!;
};

/**
 * Convenience functions that use the provider
 */

export const getKaspaBalance = async ({
	address,
	network
}: {
	address: KaspaAddress;
	network: KaspaNetworkType;
}): Promise<bigint> => {
	const provider = getKaspaApiProvider(network);
	return provider.getBalance(address);
};

export const getKaspaUtxos = async ({
	address,
	network
}: {
	address: KaspaAddress;
	network: KaspaNetworkType;
}): Promise<KaspaUtxosResponse> => {
	const provider = getKaspaApiProvider(network);
	return provider.getUtxos(address);
};

export const getKaspaTransactions = async ({
	address,
	network,
	limit,
	offset
}: {
	address: KaspaAddress;
	network: KaspaNetworkType;
	limit?: number;
	offset?: number;
}): Promise<KaspaTransaction[]> => {
	const provider = getKaspaApiProvider(network);
	return provider.getTransactions({ address, limit, offset });
};

export const submitKaspaTransaction = async ({
	transaction,
	network
}: {
	transaction: KaspaSubmitTransactionRequest;
	network: KaspaNetworkType;
}): Promise<KaspaSubmitTransactionResponse> => {
	const provider = getKaspaApiProvider(network);
	return provider.submitTransaction(transaction);
};

export const getKaspaFeeEstimate = async (
	network: KaspaNetworkType
): Promise<KaspaFeeEstimate> => {
	const provider = getKaspaApiProvider(network);
	return provider.getFeeEstimate();
};

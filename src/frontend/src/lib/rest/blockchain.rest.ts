import { BLOCKCHAIN_API_URL } from '$env/rest/blockchain.env';
import type { BitcoinAddressData, BlockchainBtcAddressDataParams } from '$lib/types/blockchain';
import { nonNullish } from '@dfinity/utils';

/**
 * Get BTC address data (including transactions).
 *
 * Documentation:
 * - https://www.blockchain.com/explorer/api/blockchain_api
 *
 */
export const btcAddressData = ({
	btcAddress,
	offset,
	limit
}: BlockchainBtcAddressDataParams): Promise<BitcoinAddressData> =>
	fetchBlockchainApi<BitcoinAddressData>({
		endpointPath: `rawaddr/${btcAddress}`,
		searchParams: {
			...(nonNullish(offset) && { offset: `${offset}` }),
			...(nonNullish(limit) && { limit: `${limit}` })
		}
	});

const fetchBlockchainApi = async <T>({
	endpointPath,
	searchParams = {}
}: {
	endpointPath: string;
	searchParams?: Record<string, string>;
}): Promise<T> => {
	const url = new URL(`${BLOCKCHAIN_API_URL}/${endpointPath}`);

	Object.entries(searchParams).forEach(([key, value]) => url.searchParams.set(key, value));

	// Some API calls are available with CORS headers if you add a &cors=true parameter to the GET request
	// https://www.blockchain.com/explorer/api/q
	url.searchParams.set('cors', 'true');

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error('Blockchain API response not ok.');
	}

	return response.json();
};

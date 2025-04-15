import { BLOCKCHAIN_API_URL } from '$env/rest/blockchain.env';
import type { BitcoinAddressData, BlockchainBtcAddressDataParams } from '$lib/types/blockchain';

/**
 * Get BTC address data (including transactions).
 *
 * Documentation:
 * - https://www.blockchain.com/explorer/api/blockchain_api
 *
 */
export const btcAddressData = ({
	btcAddress
}: BlockchainBtcAddressDataParams): Promise<BitcoinAddressData> =>
	fetchBlockchainApi<BitcoinAddressData>({
		endpointPath: `rawaddr/${btcAddress}`
	});

const fetchBlockchainApi = async <T>({ endpointPath }: { endpointPath: string }): Promise<T> => {
	const url = new URL(`${BLOCKCHAIN_API_URL}/${endpointPath}`);

	// Some API calls are available with CORS headers if you add a &cors=true parameter to the GET request
	// https://www.blockchain.com/explorer/api/q
	url.searchParams.set('cors', 'true');

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error('Blockchain API response not ok.');
	}

	return response.json();
};

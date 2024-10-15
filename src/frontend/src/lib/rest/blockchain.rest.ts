import type { BitcoinAddressData, BlockchainBtcAddressDataParams } from '$lib/types/blockchain';

const API_URL = import.meta.env.VITE_BLOCKCHAIN_API_URL;

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
	const response = await fetch(`${API_URL}/${endpointPath}`);

	if (!response.ok) {
		throw new Error('Blockchain API response not ok.');
	}

	return response.json();
};

import { isBitcoinNetworkTestnet } from '$btc/utils/network.utils';
import { BLOCKCHAIN_API_URL, BLOCKCHAIN_TESTNET_API_URL } from '$env/rest/blockchain.env';
import type { BitcoinAddressData, BlockchainBtcAddressDataParams } from '$lib/types/blockchain';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

/**
 * Get BTC address data (including transactions).
 *
 * Documentation:
 * - https://www.blockchain.com/explorer/api/blockchain_api
 *
 */
export const btcAddressData = ({
	btcAddress,
	bitcoinNetwork
}: BlockchainBtcAddressDataParams): Promise<BitcoinAddressData> =>
	fetchBlockchainApi<BitcoinAddressData>({
		endpointPath: `rawaddr/${btcAddress}`,
		bitcoinNetwork
	});

const fetchBlockchainApi = async <T>({
	endpointPath,
	bitcoinNetwork
}: {
	endpointPath: string;
	bitcoinNetwork: BitcoinNetwork;
}): Promise<T> => {
	// TODO add baseUrl for regtest for locally emulated endpoint
	const baseUrl = isBitcoinNetworkTestnet(bitcoinNetwork)
		? BLOCKCHAIN_TESTNET_API_URL
		: BLOCKCHAIN_API_URL;

	const url = new URL(`${baseUrl}/${endpointPath}`);

	// Some API calls are available with CORS headers if you add a &cors=true parameter to the GET request
	// https://www.blockchain.com/explorer/api/q
	url.searchParams.set('cors', 'true');

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error('Blockchain API response not ok.');
	}

	return response.json();
};

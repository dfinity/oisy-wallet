import {
	BLOCKSTREAM_API_URL,
	BLOCKSTREAM_REGTEST_API_URL,
	BLOCKSTREAM_TESTNET_API_URL
} from '$env/rest/blockstream.env';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
/**
 * Get latest mined BTC block height. Used for calculating the number of confirmations for a BTC transaction.
 *
 * Documentation:
 * - https://github.com/Blockstream/esplora/blob/master/API.md#get-blockstipheight
 *
 */
export const btcLatestBlockHeight = ({
	bitcoinNetwork
}: {
	bitcoinNetwork: BitcoinNetwork;
}): Promise<number> =>
	fetchBlockstreamApi<number>({
		endpointPath: `blocks/tip/height`,
		bitcoinNetwork
	});

const fetchBlockstreamApi = async <T>({
	endpointPath,
	bitcoinNetwork
}: {
	endpointPath: string;
	bitcoinNetwork: BitcoinNetwork;
}): Promise<T> => {
	let baseUrl;
	if (bitcoinNetwork === 'testnet') {
		baseUrl = BLOCKSTREAM_TESTNET_API_URL;
	} else if (bitcoinNetwork === 'regtest') {
		baseUrl = BLOCKSTREAM_REGTEST_API_URL;
	} else {
		baseUrl = BLOCKSTREAM_API_URL;
	}

	const response = await fetch(`${baseUrl}/${endpointPath}`);

	if (!response.ok) {
		throw new Error('Blockstream API response not ok.');
	}

	return response.json();
};

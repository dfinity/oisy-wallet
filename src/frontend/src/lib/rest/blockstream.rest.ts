import { isBitcoinNetworkRegtest, isBitcoinNetworkTestnet } from '$btc/utils/network.utils';
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
	const baseUrl = isBitcoinNetworkTestnet(bitcoinNetwork)
		? BLOCKSTREAM_TESTNET_API_URL
		: isBitcoinNetworkRegtest(bitcoinNetwork)
			? BLOCKSTREAM_REGTEST_API_URL
			: BLOCKSTREAM_API_URL;

	const response = await fetch(`${baseUrl}/${endpointPath}`);

	if (!response.ok) {
		throw new Error('Blockstream API response not ok.');
	}

	return response.json();
};

import { BLOCKSTREAM_API_URL } from '$env/rest/blockstream.env';

/**
 * Get latest mined BTC block height. Used for calculating the number of confirmations for a BTC transaction.
 *
 * Documentation:
 * - https://github.com/Blockstream/esplora/blob/master/API.md#get-blockstipheight
 *
 */
export const btcLatestBlockHeight = (): Promise<number> =>
	fetchBlockstreamApi<number>({
		endpointPath: `blocks/tip/height`
	});

const fetchBlockstreamApi = async <T>({ endpointPath }: { endpointPath: string }): Promise<T> => {
	const response = await fetch(`${BLOCKSTREAM_API_URL}/${endpointPath}`);

	if (!response.ok) {
		throw new Error('Blockstream API response not ok.');
	}

	return response.json();
};

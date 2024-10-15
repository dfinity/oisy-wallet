const API_URL = import.meta.env.VITE_BLOCKSTREAM_API_URL;

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
	const response = await fetch(`${API_URL}/${endpointPath}`);

	if (!response.ok) {
		throw new Error('Blockstream API response not ok.');
	}

	return response.json();
};

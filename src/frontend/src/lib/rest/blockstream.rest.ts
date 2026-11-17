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

/**
 * Whether a BTC transaction is mined, or `undefined` when the network does not know it: neither in
 * Blockstream's mempool nor in a block. Mainnet only.
 *
 * Read from the transaction itself: `tx/:txid/status` answers `{ confirmed: false }` for a txid
 * nobody knows, the same as for one in the mempool, while `tx/:txid` answers 404.
 *
 * Documentation:
 * - https://github.com/Blockstream/esplora/blob/master/API.md#get-txtxid
 *
 */
export const btcTransactionStatus = async ({
	txid
}: {
	txid: string;
}): Promise<{ confirmed: boolean } | undefined> => {
	const response = await fetch(`${BLOCKSTREAM_API_URL}/tx/${txid}`);

	if (response.status === 404) {
		return undefined;
	}

	if (!response.ok) {
		throw new Error('Blockstream API response not ok.');
	}

	const { status }: { status: { confirmed: boolean } } = await response.json();

	return status;
};

const fetchBlockstreamApi = async <T>({ endpointPath }: { endpointPath: string }): Promise<T> => {
	const response = await fetch(`${BLOCKSTREAM_API_URL}/${endpointPath}`);

	if (!response.ok) {
		throw new Error('Blockstream API response not ok.');
	}

	return response.json();
};

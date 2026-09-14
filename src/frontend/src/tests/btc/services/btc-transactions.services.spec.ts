import { loadNextBtcTransactionsByOldest } from '$btc/services/btc-transactions.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { btcAddressMainnetStore } from '$lib/stores/address.store';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { Mock } from 'vitest';

vi.mock('$lib/rest/blockchain.rest', () => ({
	btcAddressData: vi.fn()
}));

vi.mock('$lib/rest/blockstream.rest', () => ({
	btcLatestBlockHeight: vi.fn()
}));

describe('loadNextBtcTransactionsByOldest', () => {
	const tokenId = BTC_MAINNET_TOKEN.id;

	let btcAddressData: ReturnType<typeof vi.fn>;
	let btcLatestBlockHeight: ReturnType<typeof vi.fn>;
	let signalEnd: Mock<() => void>;

	const makeStoredTransaction = (id: string): BtcTransactionUi =>
		({
			id,
			type: 'receive',
			status: 'confirmed',
			timestamp: 1_700_000_000n,
			value: 1000n
		}) as unknown as BtcTransactionUi;

	const makeApiTransaction = (hash: string): BitcoinTransaction =>
		({
			hash,
			block_index: 100,
			time: 1_600_000_000,
			inputs: [],
			out: []
		}) as unknown as BitcoinTransaction;

	const setStored = (count: number) => {
		btcTransactionsStore.append({
			tokenId,
			transactions: Array.from({ length: count }, (_, index) => ({
				data: makeStoredTransaction(`stored-${index}`),
				certified: false
			}))
		});
	};

	const load = (minTimestamp?: number) =>
		loadNextBtcTransactionsByOldest({
			token: BTC_MAINNET_TOKEN,
			identity: mockIdentity,
			signalEnd,
			...(minTimestamp !== undefined && { minTimestamp })
		});

	beforeEach(async () => {
		vi.clearAllMocks();

		btcTransactionsStore.reset(tokenId);
		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });

		signalEnd = vi.fn();

		const blockchainRest = await import('$lib/rest/blockchain.rest');
		const blockstreamRest = await import('$lib/rest/blockstream.rest');

		btcAddressData = vi.mocked(blockchainRest.btcAddressData);
		btcLatestBlockHeight = vi.mocked(blockstreamRest.btcLatestBlockHeight);

		btcLatestBlockHeight.mockResolvedValue(900_000);
	});

	it('should not fetch anything while the worker has not delivered a first page', async () => {
		const result = await load();

		expect(result).toEqual({ success: false });
		expect(btcAddressData).not.toHaveBeenCalled();
	});

	it('should page by the number of transactions already loaded', async () => {
		setStored(3);

		btcAddressData.mockResolvedValue({ txs: [makeApiTransaction('0xa')], n_tx: 50 });

		await load();

		expect(btcAddressData).toHaveBeenCalledExactlyOnceWith({
			btcAddress: mockBtcAddress,
			offset: 3,
			limit: 10
		});
	});

	it('should stop at the floor when the oldest loaded transaction is already below it', async () => {
		setStored(1);

		const result = await load(1_800_000_000);

		expect(result).toEqual({ success: false });
		expect(btcAddressData).not.toHaveBeenCalled();
	});

	it('should fetch past the floor when the oldest loaded transaction is still above it', async () => {
		setStored(1);

		btcAddressData.mockResolvedValue({ txs: [makeApiTransaction('0xa')], n_tx: 50 });

		await load(1_600_000_000);

		expect(btcAddressData).toHaveBeenCalledOnce();
	});

	it('should append what it fetched', async () => {
		setStored(1);

		btcAddressData.mockResolvedValue({
			txs: [makeApiTransaction('0xa'), makeApiTransaction('0xb')],
			n_tx: 50
		});

		const result = await load();

		expect(result).toEqual({ success: true });
		expect(get(btcTransactionsStore)?.[tokenId]).toHaveLength(3);
	});

	it('should signal the end on an empty page', async () => {
		setStored(1);

		btcAddressData.mockResolvedValue({ txs: [], n_tx: 1 });

		const result = await load();

		expect(result).toEqual({ success: false });
		expect(signalEnd).toHaveBeenCalledOnce();
	});

	it('should signal the end once the address history is fully loaded', async () => {
		setStored(1);

		btcAddressData.mockResolvedValue({ txs: [makeApiTransaction('0xa')], n_tx: 2 });

		await load();

		expect(signalEnd).toHaveBeenCalledOnce();
	});

	it('should signal the end when a page adds nothing new', async () => {
		setStored(1);

		// `append` dedupes by id, so re-serving a stored transaction leaves the count untouched.
		btcAddressData.mockResolvedValue({ txs: [makeApiTransaction('stored-0')], n_tx: 50 });

		const result = await load();

		expect(result).toEqual({ success: false });
		expect(signalEnd).toHaveBeenCalledOnce();
	});

	it('should not surface a failed page', async () => {
		setStored(1);

		btcAddressData.mockRejectedValue(new Error('Blockchain API response not ok.'));

		const result = await load();

		expect(result).toEqual({ success: false });
	});

	it('should do nothing without a BTC address', async () => {
		setStored(1);

		btcAddressMainnetStore.reset();

		const result = await load();

		expect(result).toEqual({ success: false });
		expect(btcAddressData).not.toHaveBeenCalled();
	});
});

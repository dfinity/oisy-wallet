import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress, mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import {
	XRP_MAX_SKIPPED_HISTORY_PAGES,
	XRP_RIPPLE_EPOCH_OFFSET
} from '$xrp/constants/xrp.constants';
import { loadXrpTransactions } from '$xrp/rest/xrpl.rest';
import {
	loadOlderXrpTransactions,
	resetXrpHistoryPager
} from '$xrp/services/xrp-history-pager.services';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import { XrpNetworks } from '$xrp/types/network';
import type { XrpTransactionsPage, XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { get } from 'svelte/store';

vi.mock('$xrp/rest/xrpl.rest', () => ({
	loadXrpTransactions: vi.fn()
}));

describe('xrp-history-pager.services', () => {
	const { id: tokenId } = XRP_TOKEN;

	// The n-th newest transaction, as `account_tx` lists them with `forward: false`.
	const ledgerDateOf = (n: number) => 1_000 - n;

	const timestampOf = (n: number) => ledgerDateOf(n) + XRP_RIPPLE_EPOCH_OFFSET;

	const payment = (n: number) => ({
		tx: {
			TransactionType: 'Payment',
			Account: 'rSender',
			Destination: mockXrpAddress,
			Amount: '5000000',
			hash: `HASH${n}`,
			ledger_index: ledgerDateOf(n),
			date: ledgerDateOf(n)
		},
		meta: { TransactionResult: 'tesSUCCESS' },
		validated: true
	});

	const row = (n: number): XrpTransactionUi => ({
		id: `HASH${n}`,
		type: 'receive',
		status: 'confirmed',
		value: 5_000_000n,
		from: 'rSender',
		to: mockXrpAddress,
		timestamp: BigInt(timestampOf(n))
	});

	const deliverByWorker = (...ns: number[]) =>
		xrpTransactionsStore.prepend({
			tokenId,
			transactions: ns.map((n) => ({ data: row(n), certified: false }))
		});

	const heldIds = () =>
		(get(xrpTransactionsStore)?.[tokenId] ?? []).map(({ data: { id } }) => id).sort();

	const load = ({
		signalEnd = vi.fn(),
		minTimestamp
	}: {
		signalEnd?: () => void;
		minTimestamp?: number;
	} = {}) =>
		loadOlderXrpTransactions({ token: XRP_TOKEN, identity: mockIdentity, signalEnd, minTimestamp });

	beforeEach(() => {
		vi.clearAllMocks();

		resetXrpHistoryPager(tokenId);
		xrpTransactionsStore.reset(tokenId);
		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });
	});

	it('should page from the newest transaction, then resume from the marker it was handed', async () => {
		vi.mocked(loadXrpTransactions)
			.mockResolvedValueOnce({ transactions: [payment(1), payment(2)], marker: 'marker-1' })
			.mockResolvedValueOnce({ transactions: [payment(3)], marker: 'marker-2' });

		await expect(load()).resolves.toEqual({ success: true });
		await expect(load()).resolves.toEqual({ success: true });

		expect(loadXrpTransactions).toHaveBeenNthCalledWith(1, {
			address: mockXrpAddress,
			network: XrpNetworks.mainnet,
			limit: Number(WALLET_PAGINATION),
			marker: undefined
		});
		expect(loadXrpTransactions).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ marker: 'marker-1' })
		);
		expect(heldIds()).toEqual(['HASH1', 'HASH2', 'HASH3']);
	});

	// The first page it asks for is the one the worker already delivered, so it brings nothing new.
	it('should step over pages that bring nothing new within the same call', async () => {
		deliverByWorker(1, 2);

		vi.mocked(loadXrpTransactions)
			.mockResolvedValueOnce({ transactions: [payment(1), payment(2)], marker: 'marker-1' })
			.mockResolvedValueOnce({ transactions: [payment(3)], marker: 'marker-2' });

		await expect(load()).resolves.toEqual({ success: true });

		expect(loadXrpTransactions).toHaveBeenCalledTimes(2);
		expect(heldIds()).toEqual(['HASH1', 'HASH2', 'HASH3']);
	});

	it('should step over a bounded number of pages in one call', async () => {
		deliverByWorker(1);

		vi.mocked(loadXrpTransactions).mockResolvedValue({
			transactions: [payment(1)],
			marker: 'marker'
		});

		await expect(load()).resolves.toEqual({ success: true });

		expect(loadXrpTransactions).toHaveBeenCalledTimes(XRP_MAX_SKIPPED_HISTORY_PAGES + 1);
	});

	it('should signal the end on a page without a marker, and ask for nothing after it', async () => {
		const signalEnd = vi.fn();

		vi.mocked(loadXrpTransactions).mockResolvedValueOnce({ transactions: [payment(1)] });

		await load({ signalEnd });

		expect(signalEnd).toHaveBeenCalledOnce();

		await expect(load({ signalEnd })).resolves.toEqual({ success: false });

		expect(signalEnd).toHaveBeenCalledTimes(2);
		expect(loadXrpTransactions).toHaveBeenCalledOnce();
	});

	it('should keep the marker when a page fails, and ask for the same page again', async () => {
		const signalEnd = vi.fn();
		const err = new Error('account_tx down');

		vi.mocked(loadXrpTransactions)
			.mockResolvedValueOnce({ transactions: [payment(1)], marker: 'marker-1' })
			.mockRejectedValueOnce(err)
			.mockResolvedValueOnce({ transactions: [payment(2)], marker: 'marker-2' });

		await load({ signalEnd });

		await expect(load({ signalEnd })).resolves.toEqual({ success: false, err });

		await load({ signalEnd });

		expect(loadXrpTransactions).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ marker: 'marker-1' })
		);
		expect(loadXrpTransactions).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({ marker: 'marker-1' })
		);
		expect(signalEnd).not.toHaveBeenCalled();
	});

	it('should share the page in flight between the Activity list and the token page', async () => {
		const activityEnd = vi.fn();
		const tokenPageEnd = vi.fn();

		vi.mocked(loadXrpTransactions).mockResolvedValueOnce({ transactions: [payment(1)] });

		const results = await Promise.all([
			load({ signalEnd: activityEnd }),
			load({ signalEnd: tokenPageEnd })
		]);

		expect(results).toEqual([{ success: true }, { success: true }]);
		expect(loadXrpTransactions).toHaveBeenCalledOnce();
		expect(activityEnd).toHaveBeenCalledOnce();
		expect(tokenPageEnd).toHaveBeenCalledOnce();
	});

	it('should stop once the pages it walked reach the floor', async () => {
		deliverByWorker(1, 2);

		vi.mocked(loadXrpTransactions).mockResolvedValue({
			transactions: [payment(1), payment(2)],
			marker: 'marker'
		});

		await expect(load({ minTimestamp: timestampOf(1) })).resolves.toEqual({ success: true });

		expect(loadXrpTransactions).toHaveBeenCalledOnce();

		await expect(load({ minTimestamp: timestampOf(1) })).resolves.toEqual({ success: false });

		expect(loadXrpTransactions).toHaveBeenCalledOnce();
	});

	it('should start over from the newest transaction for another address', async () => {
		vi.mocked(loadXrpTransactions)
			.mockResolvedValueOnce({ transactions: [payment(1)], marker: 'marker-1' })
			.mockResolvedValueOnce({ transactions: [] });

		await load();

		xrpAddressMainnetStore.set({ data: mockXrpAddress2, certified: true });

		await load();

		expect(loadXrpTransactions).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ address: mockXrpAddress2, marker: undefined })
		);
	});

	it('should discard a page that lands after the rows were cleared', async () => {
		let deliverPage: (page: XrpTransactionsPage) => void = () => undefined;

		vi.mocked(loadXrpTransactions).mockImplementationOnce(
			() => new Promise((resolve) => (deliverPage = resolve))
		);

		const loading = load();

		resetXrpHistoryPager(tokenId);

		deliverPage({ transactions: [payment(1)], marker: 'marker' });

		await expect(loading).resolves.toEqual({ success: true });

		expect(heldIds()).toEqual([]);
	});

	it('should ask for nothing without an address', async () => {
		xrpAddressMainnetStore.reset();

		await expect(load()).resolves.toEqual({ success: false });

		expect(loadXrpTransactions).not.toHaveBeenCalled();
	});
});

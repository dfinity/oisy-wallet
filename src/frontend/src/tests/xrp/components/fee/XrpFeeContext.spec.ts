import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import XrpFeeContext from '$xrp/components/fee/XrpFeeContext.svelte';
import { XRP_DEFAULT_FEE_DROPS } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
import { XrpNetworks } from '$xrp/types/network';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { render, waitFor } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('XrpFeeContext', () => {
	const nodeFee = 15n;

	let feeStore: ReturnType<typeof initFeeStore>;
	let reserveStore: ReturnType<typeof initReserveStore>;

	const renderContext = (observe = true) => {
		const context = new Map();

		context.set(
			XRP_FEE_CONTEXT_KEY,
			initXrpFeeContext({
				feeStore,
				reserveStore,
				feeSymbolStore: writable(XRP_TOKEN.symbol),
				feeDecimalsStore: writable(XRP_TOKEN.decimals),
				feeTokenIdStore: writable(XRP_TOKEN.id),
				feeExchangeRateStore: writable(undefined)
			})
		);

		return render(XrpFeeContext, {
			props: { token: XRP_TOKEN, observe, children: mockSnippet },
			context
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();

		feeStore = initFeeStore();
		reserveStore = initReserveStore();

		xrpAddressMainnetStore.reset();
		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });

		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(nodeFee);
		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
			balance: 50_000_000n,
			sequence: 7,
			ownerCount: 0
		});
	});

	describe('the fee', () => {
		it('publishes the open-ledger fee reported by the node', async () => {
			const { unmount } = renderContext();

			await waitFor(() => {
				expect(get(feeStore)).toBe(nodeFee);
			});

			expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalledWith({
				network: XrpNetworks.mainnet,
				fallbackFee: XRP_DEFAULT_FEE_DROPS
			});

			unmount();
		});

		// The fee is best-effort: the form always needs a figure to subtract.
		it('falls back to the default fee when the node call fails', async () => {
			vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockRejectedValue(new Error('rpc down'));

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(get(feeStore)).toBe(XRP_DEFAULT_FEE_DROPS);
			});

			unmount();
		});
	});

	describe('the reserve', () => {
		it('publishes the reserve for the number of ledger objects the account owns', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
				balance: 50_000_000n,
				sequence: 7,
				ownerCount: 3
			});

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 3 }));
			});

			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: mockXrpAddress,
				network: XrpNetworks.mainnet
			});

			unmount();
		});

		// An account that is not on-ledger owns nothing, so the base reserve genuinely describes it.
		it('uses the owns-nothing reserve when the account is not found', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(
				new xrplRest.XrpAccountNotFoundError('not found')
			);

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
			});

			expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 0 }));

			unmount();
		});

		// Base-only is the SMALLEST reserve the ledger can demand, so falling back to it after an
		// operational failure would overstate the sendable maximum for an account owning objects.
		it('leaves the reserve unknown when account_info fails operationally', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(new Error('network down'));

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
			});

			expect(get(reserveStore)).toBeUndefined();

			unmount();
		});

		it('does not fetch the reserve without an address', async () => {
			xrpAddressMainnetStore.reset();

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalled();
			});

			expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();
			expect(get(reserveStore)).toBeUndefined();

			unmount();
		});
	});

	it('fetches nothing while not observing', async () => {
		const { unmount } = renderContext(false);

		await vi.waitFor(() => {
			expect(xrplRest.loadXrpOpenLedgerFee).not.toHaveBeenCalled();
		});

		expect(xrplRest.loadXrpAccountInfo).not.toHaveBeenCalled();

		unmount();
	});

	// The interval is installed only after the first request resolves, so an unmount or a rerun
	// while it is pending must invalidate it — otherwise the resolving call installs a poller
	// nothing can clear, and overlapping calls leave more than one running.
	describe('poller lifecycle', () => {
		const pendingFee = () => {
			let resolve: (fee: bigint) => void = () => undefined;
			const promise = new Promise<bigint>((res) => {
				resolve = res;
			});

			vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockReturnValue(promise);

			return { resolve };
		};

		it('installs no poller when unmounted while the first request is pending', async () => {
			vi.useFakeTimers();

			const { resolve } = pendingFee();
			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			unmount();
			resolve(nodeFee);

			await vi.advanceTimersByTimeAsync(0);

			const callsAfterUnmount = vi.mocked(xrplRest.loadXrpOpenLedgerFee).mock.calls.length;

			await vi.advanceTimersByTimeAsync(60_000);

			expect(vi.mocked(xrplRest.loadXrpOpenLedgerFee).mock.calls).toHaveLength(callsAfterUnmount);

			vi.useRealTimers();
		});

		it('runs exactly one poller after the component settles', async () => {
			vi.useFakeTimers();

			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			vi.mocked(xrplRest.loadXrpOpenLedgerFee).mockClear();

			await vi.advanceTimersByTimeAsync(10_000);

			expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalledOnce();

			unmount();
			vi.useRealTimers();
		});

		it('installs no poller while not observing', async () => {
			vi.useFakeTimers();

			const { unmount } = renderContext(false);

			await vi.advanceTimersByTimeAsync(0);

			vi.mocked(xrplRest.loadXrpOpenLedgerFee).mockClear();

			await vi.advanceTimersByTimeAsync(60_000);

			expect(xrplRest.loadXrpOpenLedgerFee).not.toHaveBeenCalled();

			unmount();
			vi.useRealTimers();
		});
	});
});

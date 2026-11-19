import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import XrpFeeContext from '$xrp/components/fee/XrpFeeContext.svelte';
import { XRP_DEFAULT_FEE_DROPS, XRP_MAX_FEE_DROPS } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpAccountNotFoundError } from '$xrp/rest/xrpl.rest';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext
} from '$xrp/stores/xrp-fee.store';
import { XrpNetworks } from '$xrp/types/network';
import type { XrpAccountInfo } from '$xrp/types/xrp-transaction';
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
			ownerCount: 0,
			flags: 0
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

		// `loadXrpOpenLedgerFee` resolves with the fallback when a successful response omits the
		// estimate and throws otherwise, so reaching the catch means no node quoted a fee. Publishing
		// the base fee there would underprice the send on the congested node that refused to quote,
		// and would open a form the unknown fee exists to keep shut.
		it('leaves the fee unknown when the first request fails', async () => {
			vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockRejectedValue(new Error('rpc down'));

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalled();
			});

			expect(get(feeStore)).toBeUndefined();

			unmount();
		});

		// A quote `sendXrp` would refuse is worse than no quote: it opens the form, is shown as the
		// reviewed fee, and fails only after the wizard has advanced. The upper bound is not merely
		// a malformed answer — the open-ledger fee escalates with queue occupancy, so a congested
		// node can quote above the maximum legitimately.
		it.each([
			{ name: 'zero', quote: ZERO },
			{ name: 'above the maximum', quote: XRP_MAX_FEE_DROPS + 1n }
		])('leaves the fee unknown when the node quotes $name', async ({ quote }) => {
			vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockResolvedValue(quote);

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalled();
			});

			expect(get(feeStore)).toBeUndefined();

			unmount();
		});

		// Out of range is treated exactly as a throw, so a later one retains rather than clears.
		it('keeps the last estimate when a later poll quotes out of range', async () => {
			vi.useFakeTimers();

			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			expect(get(feeStore)).toBe(nodeFee);

			vi.mocked(xrplRest.loadXrpOpenLedgerFee).mockResolvedValue(XRP_MAX_FEE_DROPS + 1n);

			await vi.advanceTimersByTimeAsync(10_000);

			expect(get(feeStore)).toBe(nodeFee);

			unmount();
			vi.useRealTimers();
		});

		// Ten seconds stale beats both a guess and a blank field, so a failing poll keeps what the
		// last successful one published rather than clearing it.
		it('keeps the last estimate when a later poll fails', async () => {
			vi.useFakeTimers();

			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			expect(get(feeStore)).toBe(nodeFee);

			vi.mocked(xrplRest.loadXrpOpenLedgerFee).mockRejectedValue(new Error('rpc down'));

			await vi.advanceTimersByTimeAsync(10_000);

			expect(get(feeStore)).toBe(nodeFee);

			unmount();
			vi.useRealTimers();
		});
	});

	// The reserve has had these two cases since it was written; the fee had the check only after the
	// await in `updateFee`, which runs once the store has already been written. It matters most when
	// `observe` goes false as a send starts: `send()` reads the fee to validate the amount and again
	// to sign it, so a late write lands between them and signs a figure neither saw.
	describe('fee generation', () => {
		const pendingFee = () => {
			let resolve: ((fee: bigint) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockReturnValue(
				new Promise((res) => {
					resolve = res;
				})
			);

			return { resolve: (fee: bigint) => resolve?.(fee) };
		};

		it('ignores a quote that resolves after the component is destroyed', async () => {
			const { resolve } = pendingFee();

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalled();
			});

			unmount();

			resolve(nodeFee);
			await runResolvedPromises();

			expect(get(feeStore)).toBeUndefined();
		});

		// Only the FIRST request resolves. Handing the same promise to both would let the reload's
		// own request settle too, and its quote is current — the assertion would then pass or fail
		// on the wrong call.
		it('ignores a quote superseded by a new account', async () => {
			let resolveSuperseded: ((fee: bigint) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee')
				.mockReturnValueOnce(
					new Promise((res) => {
						resolveSuperseded = res;
					})
				)
				.mockReturnValue(new Promise(() => undefined));

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalled();
			});

			xrpAddressMainnetStore.set({ data: `${mockXrpAddress}2`, certified: true });
			await runResolvedPromises();

			resolveSuperseded?.(nodeFee);
			await runResolvedPromises();

			expect(get(feeStore)).toBeUndefined();

			unmount();
		});
	});

	describe('the reserve', () => {
		it('publishes the reserve for the number of ledger objects the account owns', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockResolvedValue({
				balance: 50_000_000n,
				sequence: 7,
				ownerCount: 3,
				flags: 0
			});

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 3 }));
			});

			// The validated ledger, like the balance this reserve is displayed beside. It can therefore
			// sit below the count `sendXrp` uses, which takes the higher of both snapshots — a wrinkle
			// rather than a hazard, since the authoritative check runs at send time.
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: mockXrpAddress,
				network: XrpNetworks.mainnet,
				ledgerIndex: 'validated'
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

	// The reserve is published asynchronously and the effect reruns on an address change, so an
	// older account's response must not land on the newer account.
	// Unknown blocks Max and Next, correctly — but nothing asked again, so one dropped request cost
	// the whole form with no error and no retry the user could see. Failure-only: the normal path
	// still fetches once, because the reserve does not move while a send is composed.
	// Pins the outcome, not the mechanism, and deliberately so: `rerender` flushes the effect, which
	// bumps the generation before the quote resolves, so this passes with or without the `!observe`
	// term added alongside it. The window that term closes — `observe` false but the effect not yet
	// run — is not reachable from a component test. It is kept because it fails if the generation
	// check is removed, which is the other half of the same guard.
	it('does not publish a quote that resolves after observation stops', async () => {
		let resolveQuote: ((fee: bigint) => void) | undefined;

		vi.spyOn(xrplRest, 'loadXrpOpenLedgerFee').mockReturnValue(
			new Promise((res) => {
				resolveQuote = res;
			})
		);

		const { rerender, unmount } = renderContext();

		await waitFor(() => {
			expect(xrplRest.loadXrpOpenLedgerFee).toHaveBeenCalled();
		});

		await rerender({ token: XRP_TOKEN, observe: false, children: mockSnippet });

		resolveQuote?.(nodeFee);
		await runResolvedPromises();

		expect(get(feeStore)).toBeUndefined();

		unmount();
	});

	describe('reserve retry', () => {
		it('asks again after an operational failure and publishes once it succeeds', async () => {
			vi.useFakeTimers();

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValueOnce(new Error('network down'));

			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			expect(get(reserveStore)).toBeUndefined();

			await vi.advanceTimersByTimeAsync(10_000);

			expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 0 }));

			unmount();
			vi.useRealTimers();
		});

		// Settled, not a failure: an account that is not on-ledger owns nothing, so the base reserve
		// is the answer and asking again would only repeat it.
		it('does not retry an account that is not on-ledger', async () => {
			vi.useFakeTimers();

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(new XrpAccountNotFoundError());

			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			const callsAfterFirst = vi.mocked(xrplRest.loadXrpAccountInfo).mock.calls.length;

			await vi.advanceTimersByTimeAsync(30_000);

			expect(vi.mocked(xrplRest.loadXrpAccountInfo).mock.calls).toHaveLength(callsAfterFirst);
			expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 0 }));

			unmount();
			vi.useRealTimers();
		});

		it('stops retrying once the component is destroyed', async () => {
			vi.useFakeTimers();

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue(new Error('network down'));

			const { unmount } = renderContext();

			await vi.advanceTimersByTimeAsync(0);

			unmount();

			const callsAtUnmount = vi.mocked(xrplRest.loadXrpAccountInfo).mock.calls.length;

			await vi.advanceTimersByTimeAsync(30_000);

			expect(vi.mocked(xrplRest.loadXrpAccountInfo).mock.calls).toHaveLength(callsAtUnmount);
			expect(get(reserveStore)).toBeUndefined();

			vi.useRealTimers();
		});
	});

	describe('reserve generation', () => {
		it('leaves the reserve unknown while a load is pending', async () => {
			let resolve: ((info: XrpAccountInfo) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockReturnValue(
				new Promise((res) => {
					resolve = res;
				})
			);

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
			});

			expect(get(reserveStore)).toBeUndefined();

			resolve?.({ balance: 50_000_000n, sequence: 7, ownerCount: 0, flags: 0 });

			await waitFor(() => {
				expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 0 }));
			});

			unmount();
		});

		// The store starts `undefined`, so only an address change can show that a previously loaded
		// reserve is dropped rather than left usable for the new account.
		it('clears a loaded reserve as soon as a new account starts loading', async () => {
			const { unmount } = renderContext();

			await waitFor(() => {
				expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 0 }));
			});

			let resolve: ((info: XrpAccountInfo) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockReturnValue(
				new Promise((res) => {
					resolve = res;
				})
			);

			xrpAddressMainnetStore.set({ data: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', certified: true });

			await waitFor(() => {
				expect(get(reserveStore)).toBeUndefined();
			});

			resolve?.({ balance: 50_000_000n, sequence: 7, ownerCount: 3, flags: 0 });
			unmount();
		});

		// The case the generation check actually exists for, and the one `clears a loaded reserve as
		// soon as a new account starts loading` looks like it covers but does not — that test resolves
		// the NEW account's request and unmounts, so the old response never lands. Here only A's
		// promise resolves in the first phase; resolving both would let B's own answer satisfy the
		// assertion and the test would pass whether or not the guard works.
		it('drops a superseded account response and still publishes the current one', async () => {
			let resolveA: ((info: XrpAccountInfo) => void) | undefined;
			let resolveB: ((info: XrpAccountInfo) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpAccountInfo')
				.mockReturnValueOnce(
					new Promise((res) => {
						resolveA = res;
					})
				)
				.mockReturnValueOnce(
					new Promise((res) => {
						resolveB = res;
					})
				);

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledOnce();
			});

			xrpAddressMainnetStore.set({ data: `${mockXrpAddress}2`, certified: true });

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledTimes(2);
			});

			resolveA?.({ balance: 50_000_000n, sequence: 7, ownerCount: 9, flags: 0 });
			await runResolvedPromises();

			expect(get(reserveStore)).toBeUndefined();

			resolveB?.({ balance: 50_000_000n, sequence: 7, ownerCount: 2, flags: 0 });
			await runResolvedPromises();

			expect(get(reserveStore)).toBe(getXrpReserveDrops({ ownerCount: 2 }));

			unmount();
		});

		it('ignores a response that resolves after the component is destroyed', async () => {
			let resolve: ((info: XrpAccountInfo) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockReturnValue(
				new Promise((res) => {
					resolve = res;
				})
			);

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
			});

			unmount();

			resolve?.({ balance: 50_000_000n, sequence: 7, ownerCount: 5, flags: 0 });
			await runResolvedPromises();

			expect(get(reserveStore)).toBeUndefined();
		});

		it('ignores a superseded failure', async () => {
			let reject: ((err: Error) => void) | undefined;

			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockReturnValue(
				new Promise((_res, rej) => {
					reject = rej;
				})
			);

			const { unmount } = renderContext();

			await waitFor(() => {
				expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalled();
			});

			unmount();

			reject?.(new Error('network down'));
			await runResolvedPromises();

			expect(get(reserveStore)).toBeUndefined();
		});
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

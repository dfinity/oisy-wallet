import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Token } from '$lib/types/token';
import * as solanaApi from '$sol/api/solana.api';
import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
import { initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import * as solAddressUtils from '$sol/utils/sol-address.utils';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockSolAddress2 } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import SolFeeContextTest from '$tests/sol/components/fee/SolFeeContextTest.svelte';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSolFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { lamports } from '@solana/kit';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, writable } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('SolFeeContext', () => {
	let feeStore: ReturnType<typeof initFeeStore>;
	let prioritizationFeeStore: ReturnType<typeof initFeeStore>;
	let ataFeeStore: ReturnType<typeof initFeeStore>;
	let spyEstimatePriorityFee: MockInstance<typeof solanaApi.estimatePriorityFee>;

	const renderContext = ({
		token = SOLANA_TOKEN,
		destination
	}: { token?: Token; destination?: string } = {}) =>
		render(SolFeeContext, {
			props: { token, observe: true, children: mockSnippet, destination },
			context: mockContextMap([
				mockSolFeeContextEntry(
					initFeeContext({
						feeStore,
						prioritizationFeeStore,
						ataFeeStore,
						feeSymbolStore: writable(SOLANA_TOKEN.symbol),
						feeDecimalsStore: writable(SOLANA_TOKEN.decimals),
						feeTokenIdStore: writable(SOLANA_TOKEN.id),
						feeExchangeRateStore: writable(undefined)
					})
				)
			])
		});

	beforeEach(() => {
		vi.clearAllMocks();

		feeStore = initFeeStore();
		prioritizationFeeStore = initFeeStore();
		ataFeeStore = initFeeStore();

		// A price per compute unit: over a SOL transfer's 1,000 units it comes to 1.5 lamports, which
		// the network rounds up to 2.
		spyEstimatePriorityFee = vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(1_500n);

		// An SPL token with no destination is quoted the rent of a new token account, which would
		// otherwise be read from a live RPC.
		vi.spyOn(solanaApi, 'getSolCreateAccountFee').mockResolvedValue(lamports(2_039_280n));
	});

	// A send is signed by the user's key alone, so its base fee is that of a single signature.
	it('should quote the base fee of the one signature a send requires, plus the price over its limit', async () => {
		renderContext();

		await waitFor(() => {
			expect(get(feeStore)).toBe(5_002n);
		});

		expect(get(prioritizationFeeStore)).toBe(1_500n);
	});

	describe('an SPL send', () => {
		// 1,500 micro-lamports over 20,000 units is 30 lamports.
		it('should quote the limit of a transfer to an existing token account', async () => {
			vi.spyOn(solAddressUtils, 'isAtaAddress').mockResolvedValue(true);
			vi.spyOn(solanaApi, 'checkIfAccountExists').mockResolvedValue(true);

			renderContext({ token: mockValidSplToken, destination: mockSolAddress2 });

			await waitFor(() => {
				expect(get(feeStore)).toBe(5_030n);
			});

			expect(get(ataFeeStore)).toBeUndefined();
		});

		// 1,500 micro-lamports over 60,000 units is 90 lamports.
		it('should quote the larger limit once it is known the send opens the recipient token account', async () => {
			const ataFee = Promise.withResolvers<ReturnType<typeof lamports>>();
			vi.spyOn(solanaApi, 'getSolCreateAccountFee').mockReturnValueOnce(ataFee.promise);

			renderContext({ token: mockValidSplToken });

			await waitFor(() => {
				expect(get(feeStore)).toBe(5_030n);
			});

			ataFee.resolve(lamports(2_039_280n));

			await waitFor(() => {
				expect(get(feeStore)).toBe(5_090n);
			});

			expect(spyEstimatePriorityFee).toHaveBeenCalledOnce();
		});
	});

	describe('polling', () => {
		const pollIntervalMs = 5_000;

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		// The effect reruns for any new token object, even one for the same token, so a rerun while
		// the first estimate is still in flight is the ordinary case, not a corner.
		it('should keep a single poller when the token changes while an estimate is pending', async () => {
			const first = Promise.withResolvers<bigint>();
			const second = Promise.withResolvers<bigint>();
			spyEstimatePriorityFee.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

			const { rerender, unmount } = renderContext();

			await rerender({ token: { ...SOLANA_TOKEN } });

			expect(spyEstimatePriorityFee).toHaveBeenCalledTimes(2);

			first.resolve(1_500n);
			second.resolve(1_500n);

			await vi.advanceTimersByTimeAsync(0);

			expect(vi.getTimerCount()).toBe(1);

			await vi.advanceTimersByTimeAsync(pollIntervalMs);

			expect(spyEstimatePriorityFee).toHaveBeenCalledTimes(3);

			unmount();
		});

		it('should not let an estimate for the previous token overwrite the current one', async () => {
			const stale = Promise.withResolvers<bigint>();
			spyEstimatePriorityFee.mockReturnValueOnce(stale.promise);

			const { rerender, unmount } = renderContext();

			await rerender({ token: mockValidSplToken });
			await vi.advanceTimersByTimeAsync(0);

			expect(get(prioritizationFeeStore)).toBe(1_500n);

			stale.resolve(9_000_000n);

			await vi.advanceTimersByTimeAsync(0);

			expect(get(feeStore)).toBe(5_090n);
			expect(get(prioritizationFeeStore)).toBe(1_500n);

			unmount();
		});

		it('should not poll once destroyed while the first estimate is pending', async () => {
			const pending = Promise.withResolvers<bigint>();
			spyEstimatePriorityFee.mockReturnValueOnce(pending.promise);

			const { unmount } = renderContext();

			unmount();

			pending.resolve(1_500n);

			await vi.advanceTimersByTimeAsync(pollIntervalMs * 3);

			expect(vi.getTimerCount()).toBe(0);
			expect(spyEstimatePriorityFee).toHaveBeenCalledOnce();
			expect(get(feeStore)).toBeUndefined();
		});

		it('should keep polling and the last estimate when an estimate fails', async () => {
			const onUnhandledRejection = vi.fn();
			process.on('unhandledRejection', onUnhandledRejection);

			try {
				spyEstimatePriorityFee.mockRejectedValueOnce(new Error('rpc down'));

				const { unmount } = renderContext();

				await vi.advanceTimersByTimeAsync(0);

				expect(get(feeStore)).toBeUndefined();

				await vi.advanceTimersByTimeAsync(pollIntervalMs);

				expect(get(feeStore)).toBe(5_002n);

				spyEstimatePriorityFee.mockRejectedValueOnce(new Error('rpc down'));

				await vi.advanceTimersByTimeAsync(pollIntervalMs);
				await runResolvedPromises();

				expect(spyEstimatePriorityFee).toHaveBeenCalledTimes(3);
				expect(get(feeStore)).toBe(5_002n);
				expect(onUnhandledRejection).not.toHaveBeenCalled();

				unmount();
			} finally {
				process.off('unhandledRejection', onUnhandledRejection);
			}
		});

		describe('while the fee is held', () => {
			// Holding is driven from a store, as the wizards drive it from the "Max" flag, so that it
			// starts and ends without the context being handed its token again.
			const renderHeld = ({ token = SOLANA_TOKEN, held = false } = {}) => {
				const holdFee = writable(held);

				const result = render(SolFeeContextTest, {
					props: { token, observe: true, holdFee, children: mockSnippet },
					context: mockContextMap([
						mockSolFeeContextEntry(
							initFeeContext({
								feeStore,
								prioritizationFeeStore,
								ataFeeStore,
								feeSymbolStore: writable(SOLANA_TOKEN.symbol),
								feeDecimalsStore: writable(SOLANA_TOKEN.decimals),
								feeTokenIdStore: writable(SOLANA_TOKEN.id),
								feeExchangeRateStore: writable(undefined)
							})
						)
					])
				});

				const setHeld = async (value: boolean) => {
					holdFee.set(value);
					await tick();
				};

				return { ...result, setHeld };
			};

			it('should keep the price already quoted instead of refreshing it', async () => {
				const { setHeld, unmount } = renderHeld();

				await vi.advanceTimersByTimeAsync(0);

				expect(get(feeStore)).toBe(5_002n);

				spyEstimatePriorityFee.mockResolvedValue(9_000n);

				await setHeld(true);
				await vi.advanceTimersByTimeAsync(pollIntervalMs);

				expect(spyEstimatePriorityFee).toHaveBeenCalledTimes(2);
				expect(get(feeStore)).toBe(5_002n);
				expect(get(prioritizationFeeStore)).toBe(1_500n);

				await setHeld(false);
				await vi.advanceTimersByTimeAsync(pollIntervalMs);

				expect(get(feeStore)).toBe(5_009n);
				expect(get(prioritizationFeeStore)).toBe(9_000n);

				unmount();
			});

			// "Max" can be pressed while a poll is in flight: the price it brings back must not move the
			// fee "Max" has just held back.
			it('should not take a price that arrives once holding has started', async () => {
				const { setHeld, unmount } = renderHeld();

				await vi.advanceTimersByTimeAsync(0);

				const inFlight = Promise.withResolvers<bigint>();
				spyEstimatePriorityFee.mockReturnValueOnce(inFlight.promise);

				await vi.advanceTimersByTimeAsync(pollIntervalMs);

				await setHeld(true);

				inFlight.resolve(9_000n);

				await vi.advanceTimersByTimeAsync(0);

				expect(get(feeStore)).toBe(5_002n);
				expect(get(prioritizationFeeStore)).toBe(1_500n);

				unmount();
			});

			// The token stores hand the same token back as a new object whenever what they derive from
			// changes, which restarts the estimate.
			it('should keep holding when the same token comes back as a new object', async () => {
				const { rerender, unmount } = renderHeld({ held: true });

				await vi.advanceTimersByTimeAsync(0);

				expect(get(feeStore)).toBe(5_002n);

				spyEstimatePriorityFee.mockResolvedValue(9_000n);

				await rerender({ token: { ...SOLANA_TOKEN } });
				await vi.advanceTimersByTimeAsync(0);

				expect(spyEstimatePriorityFee).toHaveBeenCalledTimes(2);
				expect(get(feeStore)).toBe(5_002n);
				expect(get(prioritizationFeeStore)).toBe(1_500n);

				unmount();
			});

			// Nothing has been held back before a token's first price, so it is taken.
			it('should still take the first price quoted for another token', async () => {
				const { rerender, unmount } = renderHeld({ held: true });

				await vi.advanceTimersByTimeAsync(0);

				expect(get(feeStore)).toBe(5_002n);

				spyEstimatePriorityFee.mockResolvedValueOnce(9_000n).mockResolvedValue(12_000n);

				await rerender({ token: mockValidSplToken });
				await vi.advanceTimersByTimeAsync(0);

				expect(get(prioritizationFeeStore)).toBe(9_000n);

				await vi.advanceTimersByTimeAsync(pollIntervalMs);

				expect(spyEstimatePriorityFee).toHaveBeenCalledTimes(3);
				expect(get(prioritizationFeeStore)).toBe(9_000n);

				unmount();
			});
		});

		// A safety net: the swap removes this context before it sees a source token on another chain,
		// but `token` can be any `Token`, so one that isn't on a Solana network must not throw.
		it('should skip a token that is not on a Solana network without throwing', async () => {
			const onUnhandledRejection = vi.fn();
			process.on('unhandledRejection', onUnhandledRejection);

			try {
				const { rerender, unmount } = renderContext();

				await vi.advanceTimersByTimeAsync(0);

				expect(get(feeStore)).toBe(5_002n);

				await rerender({ token: BASE_ETH_TOKEN });
				await vi.advanceTimersByTimeAsync(pollIntervalMs * 3);
				await runResolvedPromises();

				expect(onUnhandledRejection).not.toHaveBeenCalled();
				expect(spyEstimatePriorityFee).toHaveBeenCalledOnce();

				unmount();
			} finally {
				process.off('unhandledRejection', onUnhandledRejection);
			}
		});
	});
});

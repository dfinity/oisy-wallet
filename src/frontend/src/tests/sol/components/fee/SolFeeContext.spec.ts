import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Token } from '$lib/types/token';
import * as solanaApi from '$sol/api/solana.api';
import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
import { initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSolFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { render, waitFor } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('SolFeeContext', () => {
	let feeStore: ReturnType<typeof initFeeStore>;
	let prioritizationFeeStore: ReturnType<typeof initFeeStore>;
	let spyEstimatePriorityFee: MockInstance<typeof solanaApi.estimatePriorityFee>;

	const renderContext = (token: Token = SOLANA_TOKEN) =>
		render(SolFeeContext, {
			props: { token, observe: true, children: mockSnippet },
			context: mockContextMap([
				mockSolFeeContextEntry(
					initFeeContext({
						feeStore,
						prioritizationFeeStore,
						ataFeeStore: initFeeStore(),
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

		// Micro-lamports across the whole transaction, so two lamports.
		spyEstimatePriorityFee = vi
			.spyOn(solanaApi, 'estimatePriorityFee')
			.mockResolvedValue(2_000_000n);
	});

	// A send is signed by the user's key alone, so its base fee is that of a single signature.
	it('should quote the base fee of the one signature a send requires, plus the priority fee', async () => {
		renderContext();

		await waitFor(() => {
			expect(get(feeStore)).toBe(5_002n);
		});

		expect(get(prioritizationFeeStore)).toBe(2_000_000n);
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

			first.resolve(2_000_000n);
			second.resolve(2_000_000n);

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

			expect(get(prioritizationFeeStore)).toBe(2_000_000n);

			stale.resolve(9_000_000n);

			await vi.advanceTimersByTimeAsync(0);

			expect(get(feeStore)).toBe(5_002n);
			expect(get(prioritizationFeeStore)).toBe(2_000_000n);

			unmount();
		});

		it('should not poll once destroyed while the first estimate is pending', async () => {
			const pending = Promise.withResolvers<bigint>();
			spyEstimatePriorityFee.mockReturnValueOnce(pending.promise);

			const { unmount } = renderContext();

			unmount();

			pending.resolve(2_000_000n);

			await vi.advanceTimersByTimeAsync(pollIntervalMs * 3);

			expect(vi.getTimerCount()).toBe(0);
			expect(spyEstimatePriorityFee).toHaveBeenCalledOnce();
			expect(get(feeStore)).toBeUndefined();
		});

		// The swap keeps this context mounted on its source token, so picking a token on another
		// chain reaches it before the Solana wizard is torn down.
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

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
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSolFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { lamports } from '@solana/kit';
import { render, waitFor } from '@testing-library/svelte';
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

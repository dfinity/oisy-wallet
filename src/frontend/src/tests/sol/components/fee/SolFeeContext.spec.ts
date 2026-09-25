import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
import { initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSolFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { render, waitFor } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('SolFeeContext', () => {
	let feeStore: ReturnType<typeof initFeeStore>;
	let prioritizationFeeStore: ReturnType<typeof initFeeStore>;

	const renderContext = () =>
		render(SolFeeContext, {
			props: { token: SOLANA_TOKEN, observe: true, children: mockSnippet },
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
		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(2_000_000n);
	});

	// A send is signed by the user's key alone, so its base fee is that of a single signature.
	it('should quote the base fee of the one signature a send requires, plus the priority fee', async () => {
		renderContext();

		await waitFor(() => {
			expect(get(feeStore)).toBe(5_002n);
		});

		expect(get(prioritizationFeeStore)).toBe(2_000_000n);
	});
});

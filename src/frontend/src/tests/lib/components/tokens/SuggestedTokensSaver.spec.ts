import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import SuggestedTokensSaver from '$lib/components/tokens/SuggestedTokensSaver.svelte';
import { ZERO } from '$lib/constants/app.constants';
import * as tokensDerived from '$lib/derived/tokens.derived';
import { saveSuggestedTokens } from '$lib/services/suggested-tokens.services';
import { balancesStore } from '$lib/stores/balances.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable } from 'svelte/store';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

vi.mock(import('$lib/services/suggested-tokens.services'), async (importOriginal) => ({
	...(await importOriginal()),
	saveSuggestedTokens: vi.fn().mockResolvedValue(undefined)
}));

describe('SuggestedTokensSaver', () => {
	const usdc = { ...USDC_TOKEN, enabled: true };

	const setBalance = (data: bigint) =>
		balancesStore.set({ id: usdc.id, data: { data, certified: true } });

	beforeEach(() => {
		vi.clearAllMocks();

		balancesStore.reinitialize();

		mockAuthStore();

		vi.spyOn(tokensDerived, 'enabledTokens', 'get').mockImplementation(() => readable([usdc]));
	});

	it('should save a suggested token once the user holds a balance in it', async () => {
		render(SuggestedTokensSaver);

		setBalance(100n);

		await waitFor(() => {
			expect(saveSuggestedTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [usdc]
			});
		});
	});

	it('should not save a suggested token without a balance', async () => {
		render(SuggestedTokensSaver);

		setBalance(ZERO);

		await tick();

		expect(saveSuggestedTokens).not.toHaveBeenCalled();
	});

	it('should save a token only once', async () => {
		render(SuggestedTokensSaver);

		setBalance(100n);

		await waitFor(() => {
			expect(saveSuggestedTokens).toHaveBeenCalledOnce();
		});

		setBalance(200n);

		await tick();

		expect(saveSuggestedTokens).toHaveBeenCalledOnce();
	});

	it('should not save without an identity', async () => {
		mockAuthStore(null);

		render(SuggestedTokensSaver);

		setBalance(100n);

		await tick();

		expect(saveSuggestedTokens).not.toHaveBeenCalled();
	});

	it('should not fail when the save rejects', async () => {
		vi.mocked(saveSuggestedTokens).mockRejectedValueOnce(new Error('Save failed'));

		render(SuggestedTokensSaver);

		setBalance(100n);

		await waitFor(() => {
			expect(saveSuggestedTokens).toHaveBeenCalledOnce();
		});
	});
});

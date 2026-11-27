import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import * as tokensIcrcCkEnv from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { USDC_TOKEN as USDC_SOL_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import * as erc20Derived from '$eth/derived/erc20.derived';
import * as icrcDerived from '$icp/derived/icrc.derived';
import SuggestedTokensSaver from '$lib/components/tokens/SuggestedTokensSaver.svelte';
import { ZERO } from '$lib/constants/app.constants';
import * as modalDerived from '$lib/derived/modal.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import { saveSuggestedTokens } from '$lib/services/suggested-tokens.services';
import { balancesStore } from '$lib/stores/balances.store';
import * as splDerived from '$sol/derived/spl.derived';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable, writable } from 'svelte/store';

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
		vi.spyOn(modalDerived, 'modalManageTokens', 'get').mockImplementation(() => readable(false));
		vi.spyOn(modalDerived, 'modalHideToken', 'get').mockImplementation(() => readable(false));
		vi.spyOn(modalDerived, 'modalIcHideToken', 'get').mockImplementation(() => readable(false));
		vi.spyOn(modalDerived, 'modalSolHideToken', 'get').mockImplementation(() => readable(false));
		vi.spyOn(icrcDerived, 'icrcCustomTokensInitialized', 'get').mockImplementation(() =>
			readable(true)
		);
		vi.spyOn(erc20Derived, 'erc20CustomTokensInitialized', 'get').mockImplementation(() =>
			readable(true)
		);
		vi.spyOn(splDerived, 'splCustomTokensInitialized', 'get').mockImplementation(() =>
			readable(true)
		);
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

	it.each([
		{ dialog: 'Manage tokens', store: 'modalManageTokens' as const },
		{ dialog: 'the ERC-20 Hide dialog', store: 'modalHideToken' as const },
		{ dialog: 'the ICRC Hide dialog', store: 'modalIcHideToken' as const },
		{ dialog: 'the SPL Hide dialog', store: 'modalSolHideToken' as const }
	])(
		'should hold the save while $dialog is open and send it after it closes',
		async ({ store }) => {
			const dialogOpen = writable(true);

			vi.spyOn(modalDerived, store, 'get').mockImplementation(() => dialogOpen);

			render(SuggestedTokensSaver);

			setBalance(100n);

			await tick();

			expect(saveSuggestedTokens).not.toHaveBeenCalled();

			dialogOpen.set(false);

			setBalance(200n);

			await waitFor(() => {
				expect(saveSuggestedTokens).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					tokens: [usdc]
				});
			});
		}
	);

	describe('while the custom tokens of a standard are loading', () => {
		const icrc = { ...mockValidIcrcToken, enabled: true };
		const usdcSol = { ...USDC_SOL_TOKEN, enabled: true };

		const icrcCustomTokensLoaded = writable(false);
		const erc20CustomTokensLoaded = writable(false);
		const splCustomTokensLoaded = writable(false);

		beforeEach(() => {
			[icrcCustomTokensLoaded, erc20CustomTokensLoaded, splCustomTokensLoaded].forEach((loaded) =>
				loaded.set(false)
			);

			vi.spyOn(icrcDerived, 'icrcCustomTokensInitialized', 'get').mockImplementation(
				() => icrcCustomTokensLoaded
			);
			vi.spyOn(erc20Derived, 'erc20CustomTokensInitialized', 'get').mockImplementation(
				() => erc20CustomTokensLoaded
			);
			vi.spyOn(splDerived, 'splCustomTokensInitialized', 'get').mockImplementation(
				() => splCustomTokensLoaded
			);

			vi.spyOn(
				tokensIcrcCkEnv,
				'ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS',
				'get'
			).mockReturnValue([icrc.ledgerCanisterId]);
		});

		it.each([
			{ standard: 'ICRC', token: icrc, loaded: icrcCustomTokensLoaded },
			{ standard: 'ERC-20', token: usdc, loaded: erc20CustomTokensLoaded },
			{ standard: 'SPL', token: usdcSol, loaded: splCustomTokensLoaded }
		])(
			'should hold an $standard token until the custom tokens of its own standard have loaded',
			async ({ token, loaded }) => {
				vi.spyOn(tokensDerived, 'enabledTokens', 'get').mockImplementation(() => readable([token]));

				render(SuggestedTokensSaver);

				balancesStore.set({ id: token.id, data: { data: 100n, certified: true } });

				await tick();

				expect(saveSuggestedTokens).not.toHaveBeenCalled();

				loaded.set(true);

				await waitFor(() => {
					expect(saveSuggestedTokens).toHaveBeenCalledExactlyOnceWith({
						identity: mockIdentity,
						tokens: [token]
					});
				});
			}
		);
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

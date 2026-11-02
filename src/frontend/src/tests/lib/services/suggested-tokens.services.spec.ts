import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as USDC_SOL_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ZERO } from '$lib/constants/app.constants';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import {
	findSuggestedTokensWithBalance,
	saveSuggestedTokens
} from '$lib/services/suggested-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { Token } from '$lib/types/token';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/services/save-custom-tokens.services', () => ({
	saveCustomTokens: vi.fn().mockResolvedValue(undefined)
}));

describe('suggested-tokens.services', () => {
	const usdc = { ...USDC_TOKEN, enabled: true };
	const usdcSol = { ...USDC_SOL_TOKEN, enabled: true };

	const balance = (data: bigint) => ({ data, certified: true });

	describe('findSuggestedTokensWithBalance', () => {
		const balances: CertifiedStoreData<BalancesData> = {
			[usdc.id]: balance(100n),
			[usdcSol.id]: balance(5n),
			[LINK_TOKEN.id]: balance(100n)
		};

		it('should find the suggested tokens the user holds a balance in and has no entry for', () => {
			expect(findSuggestedTokensWithBalance({ tokens: [usdc, usdcSol], balances })).toEqual([
				usdc,
				usdcSol
			]);
		});

		it('should skip a suggested token the user has an entry for', () => {
			const usdcWithEntry = { ...usdc, version: 1n };

			expect(findSuggestedTokensWithBalance({ tokens: [usdcWithEntry], balances })).toEqual([]);
		});

		it('should skip a suggested token without a balance', () => {
			expect(
				findSuggestedTokensWithBalance({
					tokens: [usdc, usdcSol],
					balances: { [usdc.id]: balance(ZERO) }
				})
			).toEqual([]);
		});

		it('should skip a suggested token while its balance is unknown', () => {
			expect(findSuggestedTokensWithBalance({ tokens: [usdc], balances: undefined })).toEqual([]);
		});

		it('should skip a token that is not suggested', () => {
			const link = { ...LINK_TOKEN, enabled: true };

			expect(findSuggestedTokensWithBalance({ tokens: [link], balances })).toEqual([]);
		});

		it('should skip a token that cannot be switched on or off', () => {
			const token: Token = USDC_TOKEN;

			expect(findSuggestedTokensWithBalance({ tokens: [token], balances })).toEqual([]);
		});
	});

	describe('saveSuggestedTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should save the tokens as enabled', async () => {
			await saveSuggestedTokens({ identity: mockIdentity, tokens: [usdc, usdcSol] });

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					expect.objectContaining({
						address: USDC_TOKEN.address,
						chainId: USDC_TOKEN.network.chainId,
						enabled: true,
						networkKey: 'Erc20'
					}),
					expect.objectContaining({
						address: USDC_SOL_TOKEN.address,
						enabled: true,
						networkKey: 'SplMainnet'
					})
				]
			});
		});

		it('should not save without tokens', async () => {
			await saveSuggestedTokens({ identity: mockIdentity, tokens: [] });

			expect(saveCustomTokens).not.toHaveBeenCalled();
		});

		it('should not throw when the save fails', async () => {
			vi.mocked(saveCustomTokens).mockRejectedValueOnce(new Error('Version mismatch'));

			await expect(
				saveSuggestedTokens({ identity: mockIdentity, tokens: [usdc] })
			).resolves.toBeUndefined();
		});
	});
});

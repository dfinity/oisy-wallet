import type { CustomToken } from '$declarations/backend/backend.did';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import type { NonEmptyArray } from '$lib/types/utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { saveCustomTokens } from '$sol/services/spl-custom-tokens.services';
import { loadCustomTokens } from '$sol/services/spl.services';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

vi.mock('$lib/api/backend.api', () => ({
	setManyCustomTokens: vi.fn()
}));

vi.mock('$sol/services/spl.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$sol/stores/spl-custom-tokens.store', () => ({
	splCustomTokensStore: { reset: vi.fn() }
}));

describe('spl-custom-tokens.services', () => {
	describe('saveCustomTokens', () => {
		const mockTokenId1 = parseTokenId('TK1');

		const mockTokens: NonEmptyArray<SaveSplCustomToken> = [
			{
				id: mockTokenId1,
				address: 'tok1',
				version: 1n,
				enabled: false,
				decimals: 6,
				symbol: 'TK1',
				network: SOLANA_MAINNET_NETWORK
			},
			{
				address: 'tok2',
				enabled: true,
				decimals: 6,
				symbol: 'TK2',
				network: SOLANA_MAINNET_NETWORK
			},
			{
				address: 'tok3',
				enabled: true,
				decimals: 6,
				symbol: 'TK3',
				network: SOLANA_DEVNET_NETWORK
			}
		];

		const expectedTokens: CustomToken[] = [
			{
				enabled: false,
				version: toNullable(1n),
				token: {
					SplMainnet: {
						token_address: 'tok1',
						decimals: toNullable(6),
						symbol: toNullable('TK1')
					}
				},
				section: toNullable()
			},
			{
				enabled: true,
				version: toNullable(),
				token: {
					SplMainnet: {
						token_address: 'tok2',
						decimals: toNullable(6),
						symbol: toNullable('TK2')
					}
				},
				section: toNullable()
			},
			{
				enabled: true,
				version: toNullable(),
				token: {
					SplDevnet: {
						token_address: 'tok3',
						decimals: toNullable(6),
						symbol: toNullable('TK3')
					}
				},
				section: toNullable()
			}
		];

		const progress = vi.fn();

		const mockParams: SaveTokensParams<SaveSplCustomToken> = {
			progress,
			identity: mockIdentity,
			tokens: mockTokens
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call progress with the correct steps', async () => {
			await saveCustomTokens(mockParams);

			expect(progress).toHaveBeenCalledTimes(2);
			expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(progress).toHaveBeenNthCalledWith(2, ProgressStepsAddToken.UPDATE_UI);
		});

		it('should set the custom tokens in the backend', async () => {
			await saveCustomTokens(mockParams);

			expect(setManyCustomTokens).toHaveBeenCalledOnce();
			expect(setManyCustomTokens).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				tokens: expectedTokens,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should reset disabled tokens via splCustomTokensStore', async () => {
			await saveCustomTokens(mockParams);

			expect(splCustomTokensStore.reset).toHaveBeenCalledOnce();
			expect(splCustomTokensStore.reset).toHaveBeenNthCalledWith(1, mockTokenId1);
		});

		it('should reload all custom tokens after saving', async () => {
			await saveCustomTokens(mockParams);

			expect(loadCustomTokens).toHaveBeenCalledOnce();
			expect(loadCustomTokens).toHaveBeenNthCalledWith(1, { identity: mockIdentity });
		});

		it('should throw if setManyCustomTokens fails', async () => {
			vi.mocked(setManyCustomTokens).mockRejectedValue(new Error('Network error'));

			await expect(saveCustomTokens(mockParams)).rejects.toThrow('Network error');

			expect(progress).toHaveBeenCalledOnce();
			expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(progress).not.toHaveBeenCalledWith(ProgressStepsAddToken.UPDATE_UI);

			expect(loadCustomTokens).not.toHaveBeenCalled();
		});
	});
});

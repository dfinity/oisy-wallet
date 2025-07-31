import { saveCustomTokens } from '$eth/services/erc1155-custom-tokens.services';
import { loadCustomTokens } from '$eth/services/erc1155.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import type { NonEmptyArray } from '$lib/types/utils';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import {
	createMockErc1155CustomTokens,
	createMockErc1155Tokens
} from '$tests/mocks/erc1155-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	setManyCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc1155.services', () => ({
	loadCustomTokens: vi.fn()
}));

describe('erc1155-custom-tokens.services', () => {
	describe('saveCustomTokens', () => {
		const mockTokens: SaveErc1155CustomToken[] = [
			...createMockErc1155Tokens({ n: 3, networkEnv: 'mainnet' }).map((token) => ({
				...token,
				enabled: true,
				id: undefined
			})),
			...createMockErc1155Tokens({ n: 1, networkEnv: 'testnet' }).map((token) => ({
				...token,
				enabled: true
			}))
		];

		const mockProgress = vi.fn();

		const mockParams: SaveTokensParams<SaveErc1155CustomToken> = {
			progress: mockProgress,
			identity: mockIdentity,
			tokens: mockTokens as NonEmptyArray<SaveErc1155CustomToken>
		};

		const expectedTokens = mockTokens.map((token) =>
			toCustomToken({
				...token,
				chainId: token.network.chainId,
				networkKey: 'Erc1155'
			})
		);

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			erc1155CustomTokensStore.resetAll();
		});

		it('should call the backend to save custom tokens', async () => {
			await saveCustomTokens(mockParams);

			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: expectedTokens,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should load the custom tokens after saving', async () => {
			await saveCustomTokens(mockParams);

			expect(loadCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
		});

		it('should call progress with the correct steps', async () => {
			await saveCustomTokens(mockParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsAddToken.UPDATE_UI);
		});

		it('should reset the store for disabled tokens', async () => {
			const customTokens = createMockErc1155CustomTokens({ n: 2, networkEnv: 'testnet' });
			erc1155CustomTokensStore.setAll(customTokens);

			const disabledTokens: SaveErc1155CustomToken = { ...customTokens[0].data, enabled: false };

			await saveCustomTokens({ ...mockParams, tokens: [disabledTokens] });

			expect(get(erc1155CustomTokensStore)).toEqual(
				customTokens.filter(({ data: token }) => token.id !== disabledTokens.id)
			);
		});

		it('should throw if the backend save fails', async () => {
			vi.mocked(setManyCustomTokens).mockRejectedValueOnce(new Error('Backend save error'));

			await expect(saveCustomTokens(mockParams)).rejects.toThrow('Backend save error');

			expect(mockProgress).toHaveBeenCalledExactlyOnceWith(ProgressStepsAddToken.SAVE);
			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: expectedTokens,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});

			expect(mockProgress).not.toHaveBeenCalledWith(ProgressStepsAddToken.UPDATE_UI);
			expect(loadCustomTokens).not.toHaveBeenCalled();
		});

		it('should throw if the backend load fails', async () => {
			vi.mocked(loadCustomTokens).mockRejectedValueOnce(new Error('Backend load error'));

			await expect(saveCustomTokens(mockParams)).rejects.toThrow('Backend load error');

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsAddToken.UPDATE_UI);
			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: expectedTokens,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
			expect(loadCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
		});

		it('should handle empty tokens', async () => {
			const emptyParams: SaveTokensParams<SaveErc1155CustomToken> = {
				...mockParams,
				// @ts-expect-error we test this in purposes
				tokens: []
			};

			await saveCustomTokens(emptyParams);

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsAddToken.UPDATE_UI);
			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [],
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
			expect(loadCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
		});
	});
});

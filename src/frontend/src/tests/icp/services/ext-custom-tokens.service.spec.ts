import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { saveCustomTokens } from '$icp/services/ext-custom-tokens.services';
import { loadCustomTokens } from '$icp/services/ext.services';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import type { SaveExtCustomToken } from '$icp/types/ext-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import type { NonEmptyArray } from '$lib/types/utils';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	mockExtV2TokenCanisterId,
	mockExtV2TokenCanisterId2,
	mockExtV2TokenCanisterId3
} from '$tests/mocks/ext-v2-token.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$lib/api/backend.api', () => ({
	setManyCustomTokens: vi.fn()
}));

vi.mock('$icp/services/ext.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$icp/stores/ext-custom-tokens.store', () => ({
	extCustomTokensStore: { reset: vi.fn() }
}));

describe('ext-custom-tokens.services', () => {
	describe('saveCustomTokens', () => {
		const mockTokenId1 = parseTokenId('TK1');

		const mockTokens: NonEmptyArray<SaveExtCustomToken> = [
			{
				id: mockTokenId1,
				canisterId: mockExtV2TokenCanisterId,
				version: 1n,
				enabled: false,
				network: ICP_NETWORK
			},
			{
				canisterId: mockExtV2TokenCanisterId2,
				enabled: true,
				network: ICP_NETWORK
			},
			{
				canisterId: mockExtV2TokenCanisterId3,
				enabled: true,
				network: ICP_NETWORK
			}
		];

		const expectedTokens: CustomToken[] = [
			{
				enabled: false,
				version: toNullable(1n),
				token: {
					ExtV2: {
						canister_id: Principal.fromText(mockExtV2TokenCanisterId)
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			},
			{
				enabled: true,
				version: toNullable(),
				token: {
					ExtV2: {
						canister_id: Principal.fromText(mockExtV2TokenCanisterId2)
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			},
			{
				enabled: true,
				version: toNullable(),
				token: {
					ExtV2: {
						canister_id: Principal.fromText(mockExtV2TokenCanisterId3)
					}
				},
				section: toNullable(),
				allow_external_content_source: toNullable()
			}
		];

		const progress = vi.fn();

		const mockParams: SaveTokensParams<SaveExtCustomToken> = {
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

		it('should reset disabled tokens via extCustomTokensStore', async () => {
			await saveCustomTokens(mockParams);

			expect(extCustomTokensStore.reset).toHaveBeenCalledOnce();
			expect(extCustomTokensStore.reset).toHaveBeenNthCalledWith(1, mockTokenId1);
		});

		it('should reload all custom tokens after saving', async () => {
			await saveCustomTokens(mockParams);

			expect(loadCustomTokens).toHaveBeenCalledOnce();
			expect(loadCustomTokens).toHaveBeenNthCalledWith(1, { identity: mockIdentity });
		});

		it('should throw if setManyCustomTokens fails', async () => {
			vi.mocked(setManyCustomTokens).mockRejectedValue(new Error('Network error'));

			await expect(saveCustomTokens(mockParams)).rejects.toThrowError('Network error');

			expect(progress).toHaveBeenCalledOnce();
			expect(progress).toHaveBeenNthCalledWith(1, ProgressStepsAddToken.SAVE);
			expect(progress).not.toHaveBeenCalledWith(ProgressStepsAddToken.UPDATE_UI);

			expect(loadCustomTokens).not.toHaveBeenCalled();
		});
	});
});

import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { collectionMetadata } from '$icp/api/icrc7.api';
import { loadAndAssertAddCustomToken } from '$icp/services/icrc7-add-custom-tokens.service';
import type { Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIcrc7CanisterId, mockIcrc7CanisterId2 } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icrc7.api', () => ({
	collectionMetadata: vi.fn()
}));

describe('icrc7-add-custom-tokens.service', () => {
	describe('loadAndAssertAddCustomToken', () => {
		const mockCanisterId = mockIcrc7CanisterId;

		const mockFetchedMetadata = {
			symbol: 'MOCK',
			name: 'Mock ICRC-7 Collection',
			description: 'Mock Description',
			icon: 'https://example.com/icon.png'
		};

		let spyToastsError: MockInstance;

		const validParams = {
			identity: mockIdentity,
			icrc7Tokens: [],
			canisterId: mockCanisterId
		};

		const expectedToken: Icrc7TokenWithoutId = {
			canisterId: mockCanisterId,
			standard: { code: 'icrc7' },
			category: 'custom',
			tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
			name: mockFetchedMetadata.name,
			symbol: mockFetchedMetadata.symbol,
			decimals: 0,
			network: ICP_NETWORK
		};

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			vi.mocked(collectionMetadata).mockResolvedValue(mockFetchedMetadata);
		});

		it('should reject when identity is missing', async () => {
			await expect(
				loadAndAssertAddCustomToken({
					...validParams,
					identity: undefined
				})
			).rejects.toThrow();
		});

		it('should return error when canisterId is missing', async () => {
			const { canisterId: _, ...params } = validParams;

			const result = await loadAndAssertAddCustomToken(params);

			expect(result).toEqual({ result: 'error' });
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.import.error.missing_canister_id }
			});
		});

		it('should return error when the canister is already in the list', async () => {
			const result = await loadAndAssertAddCustomToken({
				...validParams,
				icrc7Tokens: [
					{
						...expectedToken,
						id: parseTokenId('test')
					}
				]
			});

			expect(result).toEqual({ result: 'error' });
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.error.already_available }
			});
		});

		it('should return error when the token symbol/name duplicates an existing collection', async () => {
			const result = await loadAndAssertAddCustomToken({
				identity: mockIdentity,
				icrc7Tokens: [
					{
						...expectedToken,
						id: parseTokenId('test'),
						canisterId: mockIcrc7CanisterId2
					}
				],
				canisterId: mockCanisterId
			});

			expect(result).toEqual({ result: 'error' });
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.error.duplicate_metadata }
			});
		});

		it('should successfully load a new token', async () => {
			const result = await loadAndAssertAddCustomToken(validParams);

			expect(result).toStrictEqual({ result: 'success', data: { token: expectedToken } });
		});

		it('should return error when loading metadata fails', async () => {
			vi.mocked(collectionMetadata).mockRejectedValue(new Error('Failed to fetch'));

			const result = await loadAndAssertAddCustomToken(validParams);

			expect(result).toEqual({ result: 'error' });
			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.import.error.loading_metadata }
			});
			expect(collectionMetadata).toHaveBeenCalledExactlyOnceWith({
				canisterId: mockCanisterId,
				identity: mockIdentity,
				certified: true
			});
		});
	});
});

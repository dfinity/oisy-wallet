import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { collectionMetadata } from '$icp/api/icpunks.api';
import { loadAndAssertAddCustomToken } from '$icp/services/icpunks-add-custom-tokens.service';
import type { IcPunksTokenWithoutId } from '$icp/types/icpunks-token';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockICatsCanisterId2, mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icpunks.api', () => ({
	collectionMetadata: vi.fn()
}));

describe('icpunks-add-custom-tokens.service', () => {
	describe('loadAndAssertAddCustomToken', () => {
		const mockCanisterId = mockIcPunksCanisterId;

		const mockFetchedMetadata = {
			symbol: 'MOCK',
			name: 'Mock Collection',
			description: 'Mock Description',
			icon: 'https://example.com/icon.png'
		};

		let spyToastsError: MockInstance;

		const validParams = {
			identity: mockIdentity,
			icPunksTokens: [],
			canisterId: mockCanisterId
		};

		const expectedToken: IcPunksTokenWithoutId = {
			canisterId: mockCanisterId,
			standard: { code: 'icpunks' },
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

		it('should return error if identity is missing', async () => {
			await expect(
				loadAndAssertAddCustomToken({
					...validParams,
					identity: undefined
				})
			).rejects.toThrow();
		});

		it('should return error if canisterId is missing', async () => {
			const { canisterId: _, ...params } = validParams;

			const result = await loadAndAssertAddCustomToken(params);

			expect(result).toEqual({ result: 'error' });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.import.error.missing_canister_id }
			});
		});

		it('should return error if token is already available', async () => {
			const result = await loadAndAssertAddCustomToken({
				...validParams,
				icPunksTokens: [
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

		it('should successfully load a new token even if another token has the same symbol', async () => {
			const result = await loadAndAssertAddCustomToken({
				identity: mockIdentity,
				icPunksTokens: [
					{
						...expectedToken,
						id: parseTokenId('test'),
						canisterId: mockICatsCanisterId2
					}
				],
				canisterId: mockCanisterId
			});

			expect(result).toStrictEqual({ result: 'success', data: { token: expectedToken } });
		});

		it('should successfully load a new token', async () => {
			const result = await loadAndAssertAddCustomToken(validParams);

			expect(result).toStrictEqual({ result: 'success', data: { token: expectedToken } });
		});

		it('should return error if loading metadata fails', async () => {
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

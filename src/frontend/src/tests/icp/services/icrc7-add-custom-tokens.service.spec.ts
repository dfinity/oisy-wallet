import type { Value } from '$declarations/icrc7/icrc7.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { collectionMetadata } from '$icp/api/icrc7.api';
import { loadAndAssertAddCustomToken } from '$icp/services/icrc7-add-custom-tokens.service';
import type { Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icrc7.api', () => ({
	collectionMetadata: vi.fn()
}));

const mockOtherCanisterId = 'qcg3w-tyaaa-aaaah-qakea-cai';

describe('icrc7-add-custom-tokens.service', () => {
	describe('loadAndAssertAddCustomToken', () => {
		const mockCanisterId = mockIcrc7CanisterId;

		const mockFetchedEntries: Array<[string, Value]> = [
			['icrc7:name', { Text: 'Mock Collection' }],
			['icrc7:symbol', { Text: 'MOCK' }],
			['icrc7:description', { Text: 'Mock Description' }],
			['icrc7:logo', { Text: 'https://example.com/icon.png' }]
		];

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
			name: 'Mock Collection',
			symbol: 'MOCK',
			decimals: 0,
			network: ICP_NETWORK
		};

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			vi.mocked(collectionMetadata).mockResolvedValue(mockFetchedEntries);
		});

		it('should throw if identity is missing', async () => {
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

		it('should return error if a token with the same metadata already exists', async () => {
			const result = await loadAndAssertAddCustomToken({
				identity: mockIdentity,
				icrc7Tokens: [
					{
						...expectedToken,
						id: parseTokenId('test'),
						canisterId: mockOtherCanisterId
					}
				],
				canisterId: mockCanisterId
			});

			expect(result).toEqual({ result: 'error' });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.error.duplicate_metadata }
			});
		});

		it('should return error if mapped collection metadata is missing required keys', async () => {
			vi.mocked(collectionMetadata).mockResolvedValue([
				['icrc7:name', { Text: 'Only name, no symbol' }]
			]);

			const result = await loadAndAssertAddCustomToken(validParams);

			expect(result).toEqual({ result: 'error' });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.import.error.no_metadata }
			});
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

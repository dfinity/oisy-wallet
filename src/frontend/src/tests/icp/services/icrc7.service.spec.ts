import type { Value } from '$declarations/icrc7/icrc7.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ICRC7_BUILTIN_TOKENS } from '$env/tokens/tokens-icrc7/tokens.icrc7.env';
import { collectionMetadata } from '$icp/api/icrc7.api';
import {
	loadCustomTokens,
	loadDefaultIcrc7Tokens,
	loadIcrc7Tokens
} from '$icp/services/icrc7.services';
import { icrc7CustomTokensStore } from '$icp/stores/icrc7-custom-tokens.store';
import { icrc7DefaultTokensStore } from '$icp/stores/icrc7-default-tokens.store';
import { listCustomTokens } from '$lib/api/backend.api';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCustomTokensIcrc7 } from '$tests/mocks/custom-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

vi.mock('$icp/api/icrc7.api', () => ({
	collectionMetadata: vi.fn()
}));

const mockMetadataEntries: Array<[string, Value]> = [
	['icrc7:name', { Text: 'Mock Collection' }],
	['icrc7:symbol', { Text: 'MOCK' }],
	['icrc7:description', { Text: 'Mock Description' }],
	['icrc7:logo', { Text: 'https://example.com/icon.png' }]
];

describe('icrc7.services', () => {
	describe('loadDefaultIcrc7Tokens', () => {
		beforeEach(() => {
			icrc7DefaultTokensStore.reset();
		});

		it('should populate the default-tokens store from the curated builtin list', () => {
			const result = loadDefaultIcrc7Tokens();

			expect(result).toEqual({ success: true });

			const tokens = get(icrc7DefaultTokensStore) ?? [];

			expect(tokens).toHaveLength(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach((token, index) => {
				expect(tokens[index]).toEqual({
					...token,
					id: tokens[index].id
				});
			});
		});
	});

	describe('loadIcrc7Tokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsError');

			icrc7DefaultTokensStore.reset();
			icrc7CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensIcrc7);
			vi.mocked(collectionMetadata).mockResolvedValue(mockMetadataEntries);
		});

		it('should populate both default and custom stores', async () => {
			await loadIcrc7Tokens({ identity: mockIdentity });

			const defaultTokens = get(icrc7DefaultTokensStore) ?? [];

			expect(defaultTokens).toHaveLength(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach((token, index) => {
				expect(defaultTokens[index]).toEqual({
					...token,
					id: defaultTokens[index].id
				});
			});

			const customTokens = get(icrc7CustomTokensStore);

			expect(customTokens).toHaveLength(1);
			expect(customTokens?.[0].data.canisterId).toEqual(mockIcrc7CanisterId);
		});

		it('should not throw if list custom tokens throws', async () => {
			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await expect(loadIcrc7Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});
	});

	describe('loadCustomTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsError');

			icrc7CustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensIcrc7);
			vi.mocked(collectionMetadata).mockResolvedValue(mockMetadataEntries);
		});

		it('should call listCustomTokens query + update', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			expect(listCustomTokens).toHaveBeenCalledTimes(2);
			expect(listCustomTokens).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
			expect(listCustomTokens).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should fetch collectionMetadata and save into the custom store', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(icrc7CustomTokensStore);

			expect(tokens).toEqual([
				{
					certified: true,
					data: {
						id: (tokens ?? [])[0].data.id,
						version: 1n,
						enabled: true,
						standard: { code: 'icrc7' },
						category: 'custom',
						tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
						canisterId: mockIcrc7CanisterId,
						symbol: 'MOCK',
						name: 'Mock Collection',
						description: 'Mock Description',
						icon: 'https://example.com/icon.png',
						decimals: 0,
						network: ICP_NETWORK
					}
				}
			]);

			expect(collectionMetadata).toHaveBeenCalledTimes(2);
			expect(collectionMetadata).toHaveBeenNthCalledWith(1, {
				canisterId: mockIcrc7CanisterId,
				identity: mockIdentity,
				certified: false
			});
			expect(collectionMetadata).toHaveBeenNthCalledWith(2, {
				canisterId: mockIcrc7CanisterId,
				identity: mockIdentity,
				certified: true
			});
		});

		it('should reset token store on error', async () => {
			icrc7CustomTokensStore.setAll([
				{
					data: {
						id: parseTokenId('mockToken'),
						network: ICP_NETWORK,
						standard: { code: 'icrc7' },
						category: 'custom',
						tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
						canisterId: mockIcrc7CanisterId,
						symbol: 'MOCK',
						name: 'Mock Collection',
						decimals: 0,
						enabled: true
					},
					certified: false
				}
			]);

			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(icrc7CustomTokensStore)).toBeNull();
		});

		it('should display an error toast on error', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomTokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.init.error.icrc7_custom_tokens },
				err: mockError
			});
		});

		it('should cache the custom tokens in IDB on update call', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
				mockIdentity.getPrincipal().toText(),
				mockCustomTokensIcrc7,
				expect.any(Object)
			);
		});

		it('should fetch the cached custom tokens in IDB on query call', async () => {
			await loadCustomTokens({ identity: mockIdentity, useCache: true });

			expect(idbKeyval.get).toHaveBeenCalledExactlyOnceWith(
				mockIdentity.getPrincipal().toText(),
				expect.any(Object)
			);
		});

		it('should skip a token whose collectionMetadata is missing required keys', async () => {
			vi.mocked(collectionMetadata).mockResolvedValue([
				['icrc7:name', { Text: 'Only name, no symbol' }]
			]);

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(icrc7CustomTokensStore)).toEqual([]);
		});
	});
});

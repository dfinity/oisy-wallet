import type { CustomToken } from '$declarations/backend/backend.did';
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
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { toNullable } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

vi.mock('$icp/api/icrc7.api', () => ({
	collectionMetadata: vi.fn()
}));

describe('icrc7.services', () => {
	describe('loadDefaultIcrc7Tokens', () => {
		beforeEach(() => {
			icrc7DefaultTokensStore.reset();
		});

		it('should populate the default-tokens store from the curated env list', () => {
			loadDefaultIcrc7Tokens();

			const tokens = get(icrc7DefaultTokensStore);

			expect(tokens).toHaveLength(ICRC7_BUILTIN_TOKENS.length);

			ICRC7_BUILTIN_TOKENS.forEach((token, index) => {
				expect(tokens).toContainEqual({
					...token,
					id: (tokens ?? [])[index].id
				});
			});
		});

		it('should report success', () => {
			expect(loadDefaultIcrc7Tokens()).toEqual({ success: true });
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
		});

		it('should populate the default-tokens store', async () => {
			await loadIcrc7Tokens({ identity: mockIdentity });

			const tokens = get(icrc7DefaultTokensStore);

			ICRC7_BUILTIN_TOKENS.forEach((token, index) => {
				expect(tokens).toContainEqual({
					...token,
					id: (tokens ?? [])[index].id
				});
			});
		});

		it('should not throw when list_custom_tokens fails', async () => {
			vi.mocked(listCustomTokens).mockRejectedValue(new Error('boom'));

			await expect(loadIcrc7Tokens({ identity: mockIdentity })).resolves.not.toThrow();
		});
	});

	describe('loadCustomTokens', () => {
		const mockFetchedMetadata = {
			symbol: 'MOCKICRC7',
			name: 'Mock ICRC-7 Collection',
			description: 'A mock collection',
			icon: 'https://example.com/icon.png'
		};

		beforeEach(() => {
			vi.clearAllMocks();
			mockAuthStore();
			vi.spyOn(toastsStore, 'toastsError');
			icrc7CustomTokensStore.resetAll();
			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensIcrc7);
			vi.mocked(collectionMetadata).mockResolvedValue(mockFetchedMetadata);
		});

		it('should fetch custom tokens via query + update', async () => {
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

		it('should resolve metadata via collectionMetadata for non-builtin canisters', async () => {
			const mockCanisterId = mockIcrc7CanisterId;

			const customTokens: CustomToken[] = [
				{
					version: toNullable(1n),
					enabled: true,
					token: {
						Icrc7: {
							canister_id: mockCanisterId as unknown as Principal
						}
					},
					section: toNullable(),
					allow_external_content_source: toNullable()
				}
			];

			vi.mocked(listCustomTokens).mockResolvedValue(customTokens);

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
						canisterId: mockCanisterId,
						symbol: mockFetchedMetadata.symbol,
						name: mockFetchedMetadata.name,
						description: mockFetchedMetadata.description,
						icon: mockFetchedMetadata.icon,
						decimals: 0,
						network: ICP_NETWORK
					}
				}
			]);

			expect(collectionMetadata).toHaveBeenCalledTimes(2);
			expect(collectionMetadata).toHaveBeenNthCalledWith(1, {
				canisterId: mockCanisterId,
				identity: mockIdentity,
				certified: false
			});
			expect(collectionMetadata).toHaveBeenNthCalledWith(2, {
				canisterId: mockCanisterId,
				identity: mockIdentity,
				certified: true
			});
		});

		it('should reset the custom-tokens store on update error', async () => {
			icrc7CustomTokensStore.setAll([
				{
					data: {
						canisterId: mockIcrc7CanisterId,
						decimals: 0,
						network: ICP_NETWORK,
						name: 'stale',
						symbol: 'STALE',
						standard: { code: 'icrc7' },
						category: 'custom',
						tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
						id: parseTokenId('stale'),
						enabled: true
					},
					certified: false
				}
			]);

			vi.mocked(listCustomTokens).mockRejectedValue(new Error('boom'));

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(icrc7CustomTokensStore)).toBeNull();
		});

		it('should display an error toast on update error', async () => {
			const mockError = new Error('boom');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomTokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.init.error.icrc7_custom_tokens },
				err: mockError
			});
		});

		it('should cache custom tokens in IDB on update call', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
				mockIdentity.getPrincipal().toText(),
				mockCustomTokensIcrc7,
				expect.any(Object)
			);
		});

		it('should fetch cached custom tokens from IDB on query call', async () => {
			await loadCustomTokens({ identity: mockIdentity, useCache: true });

			expect(idbKeyval.get).toHaveBeenCalledExactlyOnceWith(
				mockIdentity.getPrincipal().toText(),
				expect.any(Object)
			);
		});
	});
});

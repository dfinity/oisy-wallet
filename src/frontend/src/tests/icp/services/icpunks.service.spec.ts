import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { IC_PUNKS_BUILTIN_TOKENS } from '$env/tokens/tokens-icpunks/tokens.icpunks.env';
import { loadCustomTokens, loadIcPunksTokens } from '$icp/services/icpunks.services';
import { icPunksCustomTokensStore } from '$icp/stores/icpunks-custom-tokens.store';
import { icPunksDefaultTokensStore } from '$icp/stores/icpunks-default-tokens.store';
import { listCustomTokens } from '$lib/api/backend.api';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCustomTokensIcPunks } from '$tests/mocks/custom-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

describe('icpunks.services', () => {
	const expectedCustomTokens = [
		{
			certified: true,
			data: {
				version: 1n,
				enabled: true,
				...IC_PUNKS_BUILTIN_TOKENS[0]
			}
		}
	];

	describe('loadIcPunksTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsError');

			icPunksDefaultTokensStore.reset();
			icPunksCustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensIcPunks);
		});

		it('should save the default tokens in the store', async () => {
			await loadIcPunksTokens({ identity: mockIdentity });

			const tokens = get(icPunksDefaultTokensStore);

			IC_PUNKS_BUILTIN_TOKENS.forEach((token, index) => {
				expect(tokens).toContainEqual({
					...token,
					id: (tokens ?? [])[index].id
				});
			});
		});

		it('should save the custom tokens in the store', async () => {
			await loadIcPunksTokens({ identity: mockIdentity });

			const tokens = get(icPunksCustomTokensStore);

			const expected = expectedCustomTokens.map((token, index) => ({
				...token,
				data: {
					...token.data,
					id: (tokens ?? [])[index].data.id
				}
			}));

			expect(tokens).toEqual(expected);
		});

		it('should not throw error if list custom tokens throws', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await expect(loadIcPunksTokens({ identity: mockIdentity })).resolves.not.toThrowError();
		});
	});

	describe('loadCustomTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(toastsStore, 'toastsError');

			icPunksCustomTokensStore.resetAll();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokensIcPunks);
		});

		it('should load custom ICPunks tokens', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			// query + update
			expect(listCustomTokens).toHaveBeenCalledTimes(2);
			expect(listCustomTokens).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
			expect(listCustomTokens).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				certified: true,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should save custom ICPunks tokens to store', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(icPunksCustomTokensStore);

			expect(tokens).toEqual(
				expectedCustomTokens.map((token, index) => ({
					...token,
					data: {
						...token.data,
						id: (tokens ?? [])[index].data.id
					}
				}))
			);
		});

		it('should use fallback metadata when the token is not mapped already', async () => {
			const mockCanisterId = 'mock-canister-id-that-is-not-built-in';

			const customTokens: CustomToken[] = [
				{
					version: toNullable(1n),
					enabled: true,
					token: {
						IcPunks: {
							canister_id: mockCanisterId as unknown as Principal
						}
					},
					section: toNullable(),
					allow_external_content_source: toNullable()
				}
			];

			vi.mocked(listCustomTokens).mockResolvedValue(customTokens);

			await loadCustomTokens({ identity: mockIdentity });

			const tokens = get(icPunksCustomTokensStore);

			expect(tokens).toEqual([
				{
					certified: true,
					data: {
						id: (tokens ?? [])[0].data.id,
						version: 1n,
						enabled: true,
						standard: { code: 'icpunks' },
						category: 'custom',
						canisterId: mockCanisterId,
						symbol: mockCanisterId,
						name: mockCanisterId,
						decimals: 0,
						network: ICP_NETWORK
					}
				}
			]);
		});

		it('should reset token store on error', async () => {
			icPunksCustomTokensStore.setAll([
				{
					data: {
						...IC_PUNKS_BUILTIN_TOKENS[0],
						id: parseTokenId('mockToken'),
						standard: { code: 'icpunks' },
						enabled: true
					},
					certified: false
				}
			]);

			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Error loading custom tokens'));

			await loadCustomTokens({ identity: mockIdentity });

			expect(get(icPunksCustomTokensStore)).toBeNull();
		});

		it('should display an error toast on error', async () => {
			const mockError = new Error('Error loading custom tokens');
			vi.mocked(listCustomTokens).mockRejectedValue(mockError);

			await loadCustomTokens({ identity: mockIdentity });

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.init.error.icpunks_custom_tokens },
				err: mockError
			});
		});

		it('should cache the custom tokens in IDB on update call', async () => {
			await loadCustomTokens({ identity: mockIdentity });

			expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
				mockIdentity.getPrincipal().toText(),
				mockCustomTokensIcPunks,
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
	});
});

import type { CustomToken } from '$declarations/backend/backend.did';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { listCustomTokens } from '$lib/api/backend.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import en from '$tests/mocks/i18n.mock';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

describe('custom-tokens.services', () => {
	describe('loadNetworkCustomTokens', () => {
		const mockCustomTokens: CustomToken[] = [
			{
				token: {
					Icrc: {
						ledger_id: Principal.fromText(mockLedgerCanisterId),
						index_id: toNullable(Principal.fromText(mockIndexCanisterId))
					}
				},
				version: toNullable(2n),
				enabled: true,
				state: toNullable()
			},
			{
				token: {
					Icrc: {
						ledger_id: Principal.fromText(IC_CKETH_LEDGER_CANISTER_ID),
						index_id: toNullable()
					}
				},
				version: toNullable(1n),
				enabled: false,
				state: toNullable()
			},
			{
				token: {
					SplDevnet: {
						decimals: toNullable(18),
						symbol: toNullable(),
						token_address: BONK_TOKEN.address
					}
				},
				version: toNullable(),
				enabled: true,
				state: toNullable()
			}
		];

		const mockSetIdbTokens = vi.fn();
		const mockGetIdbTokens = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			certified: true,
			filterTokens: () => true,
			setIdbTokens: mockSetIdbTokens,
			getIdbTokens: mockGetIdbTokens
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(listCustomTokens).mockResolvedValue(mockCustomTokens);

			mockGetIdbTokens.mockImplementation(vi.fn());
		});

		it('should load the custom tokens from the backend', async () => {
			const result = await loadNetworkCustomTokens(mockParams);

			expect(result).toStrictEqual(mockCustomTokens);

			expect(listCustomTokens).toHaveBeenCalledOnce();
			expect(listCustomTokens).toHaveBeenNthCalledWith(1, {
				certified: true,
				identity: mockIdentity,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should filter the custom tokens based on the provided filter function', async () => {
			const result = await loadNetworkCustomTokens({
				...mockParams,
				filterTokens: ({ token }) => 'Icrc' in token
			});

			expect(result).toStrictEqual(mockCustomTokens.slice(0, 2));
		});

		it('should handle empty token list from the backend', async () => {
			vi.mocked(listCustomTokens).mockResolvedValue([]);

			const result = await loadNetworkCustomTokens(mockParams);

			expect(result).toStrictEqual([]);
		});

		it('should handle empty list of filtered tokens', async () => {
			const result = await loadNetworkCustomTokens({
				...mockParams,
				filterTokens: () => false
			});

			expect(result).toStrictEqual([]);
		});

		it('should set the IDB tokens if certified call', async () => {
			await loadNetworkCustomTokens(mockParams);

			expect(mockSetIdbTokens).toHaveBeenCalledOnce();
			expect(mockSetIdbTokens).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				tokens: mockCustomTokens
			});
		});

		it('should not set the IDB tokens if not certified call', async () => {
			await loadNetworkCustomTokens({
				...mockParams,
				certified: false
			});

			expect(mockSetIdbTokens).not.toHaveBeenCalled();
		});

		it('should not set the IDB tokens if the backend tokens are empty', async () => {
			vi.mocked(listCustomTokens).mockResolvedValue([]);

			await loadNetworkCustomTokens(mockParams);

			expect(mockSetIdbTokens).not.toHaveBeenCalled();
		});

		it('should not set the IDB tokens if the filtered tokens are empty', async () => {
			await loadNetworkCustomTokens({
				...mockParams,
				filterTokens: () => false
			});

			expect(mockSetIdbTokens).not.toHaveBeenCalled();
		});

		it('should throw if listCustomTokens fails', async () => {
			vi.mocked(listCustomTokens).mockRejectedValue(new Error('Backend error'));

			await expect(loadNetworkCustomTokens(mockParams)).rejects.toThrow('Backend error');
		});

		it('should throw if setIdbTokens fails', async () => {
			mockSetIdbTokens.mockRejectedValue(new Error('IDB error'));

			await expect(loadNetworkCustomTokens(mockParams)).rejects.toThrow('IDB error');
		});

		it('should sign out if the identity is nullish', async () => {
			await expect(loadNetworkCustomTokens({ ...mockParams, identity: null })).resolves.toEqual([]);

			expect(nullishSignOut).toHaveBeenCalledOnce();

			await expect(
				loadNetworkCustomTokens({ ...mockParams, identity: undefined })
			).resolves.toEqual([]);

			expect(nullishSignOut).toHaveBeenCalledTimes(2);
		});

		it('should fetch the cached tokens if useCache is true and certified is false', async () => {
			mockGetIdbTokens.mockResolvedValue(mockCustomTokens.slice(0, 2));

			const result = await loadNetworkCustomTokens({
				...mockParams,
				certified: false,
				useCache: true
			});

			expect(result).toStrictEqual(mockCustomTokens.slice(0, 2));

			expect(mockGetIdbTokens).toHaveBeenCalledOnce();
			expect(mockGetIdbTokens).toHaveBeenNthCalledWith(1, mockIdentity.getPrincipal());

			expect(listCustomTokens).not.toHaveBeenCalled();
		});

		it('should load the tokens from backend if there are no cached tokens', async () => {
			mockGetIdbTokens.mockResolvedValue(undefined);

			const result = await loadNetworkCustomTokens({
				...mockParams,
				certified: false,
				useCache: true
			});

			expect(result).toStrictEqual(mockCustomTokens);

			expect(mockGetIdbTokens).toHaveBeenCalledOnce();
			expect(mockGetIdbTokens).toHaveBeenNthCalledWith(1, mockIdentity.getPrincipal());

			expect(listCustomTokens).toHaveBeenCalledOnce();
			expect(listCustomTokens).toHaveBeenNthCalledWith(1, {
				certified: false,
				identity: mockIdentity,
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should parse correctly the cached ledger and index canister IDs from the custom tokens', async () => {
			mockGetIdbTokens.mockResolvedValue([
				{
					token: {
						Icrc: {
							ledger_id: Principal.fromText(mockLedgerCanisterId).toUint8Array(),
							index_id: toNullable(Principal.fromText(mockIndexCanisterId).toUint8Array())
						}
					},
					version: toNullable(2n),
					enabled: true,
					state: toNullable()
				}
			]);

			const result = await loadNetworkCustomTokens({
				...mockParams,
				certified: false,
				useCache: true
			});

			expect(result).toStrictEqual(mockCustomTokens.slice(0, 1));

			expect(mockGetIdbTokens).toHaveBeenCalledOnce();
			expect(mockGetIdbTokens).toHaveBeenNthCalledWith(1, mockIdentity.getPrincipal());

			expect(listCustomTokens).not.toHaveBeenCalled();
		});
	});
});

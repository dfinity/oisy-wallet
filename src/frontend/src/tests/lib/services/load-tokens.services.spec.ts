import type { CustomToken, IcrcToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { mapBackendTokens } from '$lib/services/load-tokens.services';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockCustomTokens } from '$tests/mocks/custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fromNullable, nonNullish } from '@dfinity/utils';

vi.mock('$lib/services/custom-tokens.services', () => ({
	loadNetworkCustomTokens: vi.fn()
}));

vi.mock('$lib/stores/toasts.store', () => ({
	toastsError: vi.fn()
}));

describe('load-tokens.services', () => {
	describe('mapBackendTokens', () => {
		type CustomTokenIcrcVariant = Omit<CustomToken, 'token'> & { token: { Icrc: IcrcToken } };

		type Params = Parameters<typeof mapBackendTokens<CustomTokenIcrcVariant, IcrcCustomToken>>[0];

		const filterBackendTokensImpl = (
			customToken: CustomToken
		): customToken is CustomTokenIcrcVariant => 'Icrc' in customToken.token;

		const mapBackendTokensImpl = ({
			token: { enabled, version: v, token }
		}: {
			token: CustomTokenIcrcVariant;
		}): IcrcCustomToken => {
			const {
				Icrc: { ledger_id, index_id }
			} = token;

			const indexCanisterId = fromNullable(index_id);

			const ledgerCanisterId = ledger_id.toText();

			const version = fromNullable(v);

			return {
				ledgerCanisterId,
				indexCanisterId: indexCanisterId?.toText(),
				id: parseTokenId(ledgerCanisterId),
				network: ICP_NETWORK,
				standard: { code: 'icrc' as const },
				category: 'custom' as const,
				fee: 123n,
				name: `Token ${ledgerCanisterId}`,
				symbol: `TKN${ledgerCanisterId.slice(0, 4)}`,
				decimals: 8,
				enabled,
				...(nonNullish(version) && { version })
			};
		};

		const expectedFilteredTokens: CustomTokenIcrcVariant[] =
			mockCustomTokens.filter(filterBackendTokensImpl);

		const expectedMappedTokens: IcrcCustomToken[] = expectedFilteredTokens.map((token) =>
			mapBackendTokensImpl({ token })
		);

		const mapBackendTokensTyped = (params: Params) =>
			mapBackendTokens<CustomTokenIcrcVariant, IcrcCustomToken>(params);

		const filterCustomToken = vi.fn<Params['filterCustomToken']>();
		const mapCustomToken = vi.fn<Params['mapCustomToken']>();
		const errorMsg = 'Error mapping custom token';

		const loadParams: LoadCustomTokenParams = {
			identity: mockIdentity,
			certified: false,
			useCache: true
		};

		const params: Params = {
			...loadParams,
			tokens: mockCustomTokens,
			filterCustomToken: filterCustomToken as unknown as Params['filterCustomToken'],
			mapCustomToken: mapCustomToken as unknown as Params['mapCustomToken'],
			errorMsg
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(loadNetworkCustomTokens).mockResolvedValue(mockCustomTokens);

			filterCustomToken.mockImplementation(filterBackendTokensImpl);

			mapCustomToken.mockImplementation((params) => Promise.resolve(mapBackendTokensImpl(params)));
		});

		it('should not fetch the custom tokens from the backend if they are provided', async () => {
			await mapBackendTokensTyped(params);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();
		});

		it('should fetch the custom tokens from the backend if none are provided', async () => {
			const { tokens: _, ...paramsWithoutTokens } = params;

			await mapBackendTokensTyped(paramsWithoutTokens);

			expect(loadNetworkCustomTokens).toHaveBeenCalledExactlyOnceWith(loadParams);
		});

		it('should throw an error if loading the custom tokens fails', async () => {
			const mockError = new Error('Backend error');
			vi.mocked(loadNetworkCustomTokens).mockRejectedValueOnce(mockError);

			const { tokens: _, ...paramsWithoutTokens } = params;

			await expect(mapBackendTokensTyped(paramsWithoutTokens)).rejects.toThrowError(mockError);

			expect(loadNetworkCustomTokens).toHaveBeenCalledExactlyOnceWith(loadParams);

			expect(filterCustomToken).not.toHaveBeenCalled();
			expect(mapCustomToken).not.toHaveBeenCalled();
		});

		it('should handle empty custom tokens', async () => {
			const result = await mapBackendTokensTyped({ ...params, tokens: [] });

			expect(result).toStrictEqual([]);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();

			expect(filterCustomToken).not.toHaveBeenCalled();
			expect(mapCustomToken).not.toHaveBeenCalled();
		});

		it('should filter and map the backend custom tokens correctly', async () => {
			const result = await mapBackendTokensTyped(params);

			expect(result).toEqual(
				expectedMappedTokens.map((token, index) => ({
					...token,
					id: result[index].id
				}))
			);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();

			expect(filterCustomToken).toHaveBeenCalledTimes(mockCustomTokens.length);

			mockCustomTokens.forEach((token, index) =>
				expect(filterCustomToken).toHaveBeenNthCalledWith(index + 1, token)
			);

			expect(mapCustomToken).toHaveBeenCalledTimes(expectedFilteredTokens.length);

			expectedFilteredTokens.forEach((token, index) =>
				expect(mapCustomToken).toHaveBeenNthCalledWith(index + 1, {
					token,
					identity: loadParams.identity,
					certified: loadParams.certified
				})
			);
		});

		it('should handle mapping errors and show toasts for certified requests', async () => {
			const mappingError = new Error('Mapping error');
			mapCustomToken.mockRejectedValueOnce(mappingError);

			const result = await mapBackendTokensTyped({ ...params, certified: true });

			const successfullyMappedTokens = expectedMappedTokens.slice(1); // Exclude the first token which failed to map

			expect(result).toEqual(
				successfullyMappedTokens.map((token, index) => ({
					...token,
					id: result[index].id
				}))
			);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();

			expect(filterCustomToken).toHaveBeenCalledTimes(mockCustomTokens.length);

			mockCustomTokens.forEach((token, index) =>
				expect(filterCustomToken).toHaveBeenNthCalledWith(index + 1, token)
			);

			expect(mapCustomToken).toHaveBeenCalledTimes(expectedFilteredTokens.length);

			expectedFilteredTokens.forEach((token, index) =>
				expect(mapCustomToken).toHaveBeenNthCalledWith(index + 1, {
					token,
					identity: loadParams.identity,
					certified: true
				})
			);

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: errorMsg },
				err: mappingError
			});
		});

		it('should not show toasts for mapping errors on uncertified requests', async () => {
			const mappingError = new Error('Mapping error');
			mapCustomToken.mockRejectedValueOnce(mappingError);

			const result = await mapBackendTokensTyped({ ...params, certified: false });

			const successfullyMappedTokens = expectedMappedTokens.slice(1); // Exclude the first token which failed to map

			expect(result).toEqual(
				successfullyMappedTokens.map((token, index) => ({
					...token,
					id: result[index].id
				}))
			);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();

			expect(filterCustomToken).toHaveBeenCalledTimes(mockCustomTokens.length);

			mockCustomTokens.forEach((token, index) =>
				expect(filterCustomToken).toHaveBeenNthCalledWith(index + 1, token)
			);

			expect(mapCustomToken).toHaveBeenCalledTimes(expectedFilteredTokens.length);

			expectedFilteredTokens.forEach((token, index) =>
				expect(mapCustomToken).toHaveBeenNthCalledWith(index + 1, {
					token,
					identity: loadParams.identity,
					certified: false
				})
			);

			expect(toastsError).not.toHaveBeenCalled();
		});

		it('should return an empty array if no tokens are filtered successfully', async () => {
			filterCustomToken.mockReturnValue(false);

			const result = await mapBackendTokensTyped({ ...params, certified: false });

			expect(result).toEqual([]);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();

			expect(filterCustomToken).toHaveBeenCalledTimes(mockCustomTokens.length);

			mockCustomTokens.forEach((token, index) =>
				expect(filterCustomToken).toHaveBeenNthCalledWith(index + 1, token)
			);

			expect(mapCustomToken).not.toHaveBeenCalled();

			expect(toastsError).not.toHaveBeenCalled();
		});

		it('should return an empty array if no tokens are mapped successfully', async () => {
			mapCustomToken.mockRejectedValue(new Error('Mapping error'));

			const result = await mapBackendTokensTyped({ ...params, certified: false });

			expect(result).toEqual([]);

			expect(loadNetworkCustomTokens).not.toHaveBeenCalled();

			expect(filterCustomToken).toHaveBeenCalledTimes(mockCustomTokens.length);

			mockCustomTokens.forEach((token, index) =>
				expect(filterCustomToken).toHaveBeenNthCalledWith(index + 1, token)
			);

			expect(mapCustomToken).toHaveBeenCalledTimes(expectedFilteredTokens.length);

			expectedFilteredTokens.forEach((token, index) =>
				expect(mapCustomToken).toHaveBeenNthCalledWith(index + 1, {
					token,
					identity: loadParams.identity,
					certified: false
				})
			);

			expect(toastsError).not.toHaveBeenCalled();
		});
	});
});

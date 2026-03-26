import type { CustomToken } from '$declarations/backend/backend.did';
import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import * as customTokensServices from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import * as consoleUtils from '$lib/utils/console.utils';
import * as customTokenUtils from '$lib/utils/custom-token.utils';
import * as tokensUtils from '$lib/utils/tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import * as solanaApi from '$sol/api/solana.api';
import * as quicknodeRest from '$sol/rest/quicknode.rest';
import {
	getSplMetadata,
	loadCustomTokens,
	loadDefaultSplTokens,
	loadSplTokens,
	processCustomTokens
} from '$sol/services/spl.services';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { get } from 'svelte/store';

vi.mock('$sol/api/solana.api');
vi.mock('$sol/rest/quicknode.rest');
vi.mock('$lib/services/custom-tokens.services');

vi.mock(import('@dfinity/utils'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		queryAndUpdate: vi.fn(async ({ request, onLoad, onUpdateError, identity }) => {
			try {
				const response = await request({ identity, certified: false });
				onLoad({ response, certified: false });
			} catch (error) {
				onUpdateError?.({ error });
			}
		})
	};
});

describe('spl.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();
	});

	describe('loadDefaultSplTokens', () => {
		it('should set SPL_TOKENS in the store', () => {
			const result = loadDefaultSplTokens();

			expect(result).toEqual({ success: true });
			expect(get(splDefaultTokensStore)).toEqual(SPL_TOKENS);
		});

		it('should return success false and show error toast on failure', () => {
			const setSpy = vi.spyOn(splDefaultTokensStore, 'set').mockImplementationOnce(() => {
				throw new Error('store error');
			});

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			const result = loadDefaultSplTokens();

			expect(result).toEqual({ success: false });
			expect(toastsSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					msg: { text: get(i18n).init.error.spl_tokens }
				})
			);

			setSpy.mockRestore();
		});
	});

	describe('loadSplTokens', () => {
		it('should call both loadDefaultSplTokens and loadCustomTokens', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue([]);

			await loadSplTokens({ identity: mockIdentity });

			expect(get(splDefaultTokensStore)).toEqual(SPL_TOKENS);
		});
	});

	describe('loadCustomTokens', () => {
		it('should load custom tokens and set store', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue([]);

			await loadCustomTokens({ identity: mockIdentity });

			expect(customTokensServices.loadNetworkCustomTokens).toHaveBeenCalled();
		});

		it('should handle existing SPL tokens by matching address and network', async () => {
			const [existingToken] = SPL_TOKENS;

			if (!existingToken) {
				return;
			}

			const mockBackendTokens: CustomToken[] = [
				{
					token: {
						SplMainnet: {
							symbol: toNullable(existingToken.symbol),
							decimals: toNullable(existingToken.decimals),
							token_address: existingToken.address
						}
					},
					enabled: true,
					version: toNullable(1n),
					allow_external_content_source: toNullable(false),
					section: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(mockBackendTokens);

			await loadCustomTokens({ identity: mockIdentity });
		});

		it('should fetch token info for non-existing tokens', async () => {
			const mockAddress = 'NewTokenAddress123456789';
			const mockBackendTokens: CustomToken[] = [
				{
					token: {
						SplMainnet: {
							symbol: toNullable('NEW'),
							decimals: toNullable(6),
							token_address: mockAddress
						}
					},
					enabled: true,
					version: toNullable(1n),
					allow_external_content_source: toNullable(false),
					section: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(mockBackendTokens);
			vi.mocked(solanaApi.getTokenInfo).mockResolvedValue({
				owner: TOKEN_PROGRAM_ADDRESS,
				symbol: 'NEW',
				name: 'New Token',
				decimals: 6
			});
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue(undefined);
			vi.spyOn(customTokenUtils, 'parseCustomTokenId').mockReturnValue(
				parseTokenId('mock-custom-id')
			);
			vi.spyOn(tokensUtils, 'getCodebaseTokenIconPath').mockReturnValue(undefined);

			await loadCustomTokens({ identity: mockIdentity });

			expect(solanaApi.getTokenInfo).toHaveBeenCalled();
		});

		it('should skip tokens with no owner', async () => {
			const mockAddress = 'NoOwnerTokenAddress';
			const mockBackendTokens: CustomToken[] = [
				{
					token: {
						SplMainnet: {
							symbol: toNullable('X'),
							decimals: toNullable(6),
							token_address: mockAddress
						}
					},
					enabled: true,
					version: toNullable(1n),
					allow_external_content_source: toNullable(false),
					section: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(mockBackendTokens);
			vi.mocked(solanaApi.getTokenInfo).mockResolvedValue({
				owner: undefined,
				symbol: 'X',
				name: 'X',
				decimals: 6
			});

			await loadCustomTokens({ identity: mockIdentity });

			expect(quicknodeRest.splMetadata).not.toHaveBeenCalled();
		});

		it('should handle SplDevnet tokens', async () => {
			const mockAddress = 'DevnetTokenAddress';
			const mockBackendTokens: CustomToken[] = [
				{
					token: {
						SplDevnet: {
							symbol: toNullable('DEV'),
							decimals: toNullable(SOLANA_DEFAULT_DECIMALS),
							token_address: mockAddress
						}
					},
					enabled: true,
					version: toNullable(1n),
					allow_external_content_source: toNullable(false),
					section: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(mockBackendTokens);
			vi.mocked(solanaApi.getTokenInfo).mockResolvedValue({
				owner: TOKEN_PROGRAM_ADDRESS,
				symbol: 'DEV',
				name: 'Dev Token',
				decimals: SOLANA_DEFAULT_DECIMALS
			});
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue(undefined);
			vi.spyOn(customTokenUtils, 'parseCustomTokenId').mockReturnValue(parseTokenId('mock-dev-id'));
			vi.spyOn(tokensUtils, 'getCodebaseTokenIconPath').mockReturnValue(undefined);

			await loadCustomTokens({ identity: mockIdentity });

			expect(solanaApi.getTokenInfo).toHaveBeenCalled();
		});

		it('should skip tokens that are neither SplMainnet nor SplDevnet', async () => {
			const mockBackendTokens: CustomToken[] = [
				{
					// @ts-expect-error: intentionally testing an unrecognized token variant
					token: { SomeOtherType: {} },
					enabled: true,
					version: toNullable(1n),
					allow_external_content_source: toNullable(false),
					section: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(mockBackendTokens);

			await loadCustomTokens({ identity: mockIdentity });

			expect(solanaApi.getTokenInfo).not.toHaveBeenCalled();
		});

		it('should reset store and show error on update error', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockRejectedValue(
				new Error('Network error')
			);

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');
			const resetSpy = vi.spyOn(splCustomTokensStore, 'resetAll');

			await loadCustomTokens({ identity: mockIdentity });

			expect(resetSpy).toHaveBeenCalled();
			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: get(i18n).init.error.spl_custom_tokens }
				})
			);
		});
	});

	describe('getSplMetadata', () => {
		const params = {
			address: 'TokenAddress123' as string,
			network: 'mainnet' as const
		};

		it('should return metadata on success', async () => {
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue({
				result: {
					content: {
						metadata: { name: 'Test Token', symbol: 'TST' },
						links: { image: 'https://example.com/icon.png' }
					}
				}
			});

			const result = await getSplMetadata(params);

			expect(result).toEqual({
				name: 'Test Token',
				symbol: 'TST',
				icon: 'https://example.com/icon.png'
			});
		});

		it('should return undefined when metadata result is null', async () => {
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue(undefined);

			const result = await getSplMetadata(params);

			expect(result).toBeUndefined();
		});

		it('should return undefined and log warning on error', async () => {
			vi.mocked(quicknodeRest.splMetadata).mockRejectedValue(new Error('RPC error'));

			const warnSpy = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

			const result = await getSplMetadata(params);

			expect(result).toBeUndefined();
			expect(warnSpy).toHaveBeenCalledOnce();

			warnSpy.mockRestore();
		});
	});

	describe('processCustomTokens', () => {
		const baseParams = {
			identity: mockIdentity,
			certified: false
		};

		it('should load and cache custom tokens on uncertified call', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue([]);

			await processCustomTokens(baseParams);
		});

		it('should reuse cached response on certified call after uncertified', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue([]);

			await processCustomTokens({ ...baseParams, certified: false });

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockClear();

			await processCustomTokens({ ...baseParams, certified: true });

			expect(customTokensServices.loadNetworkCustomTokens).not.toHaveBeenCalled();
		});

		it('should clear cache and show error on certified failure', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockRejectedValue(new Error('fail'));

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			// First, an uncertified failure clears the module-level cache
			await processCustomTokens({ ...baseParams, certified: false });

			// Then the certified failure should trigger onUpdateError
			await processCustomTokens({ ...baseParams, certified: true });

			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: get(i18n).init.error.spl_custom_tokens }
				})
			);
		});

		it('should not show error on uncertified failure', async () => {
			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockRejectedValue(new Error('fail'));

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await processCustomTokens({ ...baseParams, certified: false });

			expect(toastsSpy).not.toHaveBeenCalled();
		});
	});
});

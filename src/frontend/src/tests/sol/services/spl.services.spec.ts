import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import * as customTokensServices from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import * as consoleUtils from '$lib/utils/console.utils';
import * as customTokenUtils from '$lib/utils/custom-token.utils';
import * as tokensUtils from '$lib/utils/tokens.utils';
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

			const mockBackendTokens = [
				{
					token: {
						SplMainnet: {
							symbol: [],
							decimals: [],
							token_address: existingToken.address,
							network: SOLANA_MAINNET_NETWORK
						}
					},
					enabled: true,
					version: [],
					allow_external_content_source: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(
				mockBackendTokens as never
			);

			await loadCustomTokens({ identity: mockIdentity });
		});

		it('should fetch token info for non-existing tokens', async () => {
			const mockAddress = 'NewTokenAddress123456789';
			const mockBackendTokens = [
				{
					token: {
						SplMainnet: {
							symbol: [],
							decimals: [],
							token_address: mockAddress,
							network: SOLANA_MAINNET_NETWORK
						}
					},
					enabled: true,
					version: [],
					allow_external_content_source: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(
				mockBackendTokens as never
			);
			vi.mocked(solanaApi.getTokenInfo).mockResolvedValue({
				owner: TOKEN_PROGRAM_ADDRESS,
				symbol: 'NEW',
				name: 'New Token',
				decimals: 6
			} as never);
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue(undefined);
			vi.spyOn(customTokenUtils, 'parseCustomTokenId').mockReturnValue('mock-custom-id' as never);
			vi.spyOn(tokensUtils, 'getCodebaseTokenIconPath').mockReturnValue(undefined);

			await loadCustomTokens({ identity: mockIdentity });

			expect(solanaApi.getTokenInfo).toHaveBeenCalled();
		});

		it('should skip tokens with no owner', async () => {
			const mockAddress = 'NoOwnerTokenAddress';
			const mockBackendTokens = [
				{
					token: {
						SplMainnet: {
							symbol: [],
							decimals: [],
							token_address: mockAddress,
							network: SOLANA_MAINNET_NETWORK
						}
					},
					enabled: true,
					version: [],
					allow_external_content_source: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(
				mockBackendTokens as never
			);
			vi.mocked(solanaApi.getTokenInfo).mockResolvedValue({
				owner: undefined,
				symbol: 'X',
				name: 'X',
				decimals: 6
			} as never);

			await loadCustomTokens({ identity: mockIdentity });

			expect(quicknodeRest.splMetadata).not.toHaveBeenCalled();
		});

		it('should handle SplDevnet tokens', async () => {
			const mockAddress = 'DevnetTokenAddress';
			const mockBackendTokens = [
				{
					token: {
						SplDevnet: {
							symbol: [],
							decimals: [],
							token_address: mockAddress,
							network: SOLANA_DEVNET_NETWORK
						}
					},
					enabled: true,
					version: [],
					allow_external_content_source: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(
				mockBackendTokens as never
			);
			vi.mocked(solanaApi.getTokenInfo).mockResolvedValue({
				owner: TOKEN_PROGRAM_ADDRESS,
				symbol: 'DEV',
				name: 'Dev Token',
				decimals: SOLANA_DEFAULT_DECIMALS
			} as never);
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue(undefined);
			vi.spyOn(customTokenUtils, 'parseCustomTokenId').mockReturnValue('mock-dev-id' as never);
			vi.spyOn(tokensUtils, 'getCodebaseTokenIconPath').mockReturnValue(undefined);

			await loadCustomTokens({ identity: mockIdentity });

			expect(solanaApi.getTokenInfo).toHaveBeenCalled();
		});

		it('should skip tokens that are neither SplMainnet nor SplDevnet', async () => {
			const mockBackendTokens = [
				{
					token: { SomeOtherType: {} },
					enabled: true,
					version: [],
					allow_external_content_source: []
				}
			];

			vi.mocked(customTokensServices.loadNetworkCustomTokens).mockResolvedValue(
				mockBackendTokens as never
			);

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
			} as never);

			const result = await getSplMetadata(params);

			expect(result).toEqual({
				name: 'Test Token',
				symbol: 'TST',
				icon: 'https://example.com/icon.png'
			});
		});

		it('should return undefined when metadata result is null', async () => {
			vi.mocked(quicknodeRest.splMetadata).mockResolvedValue(null as never);

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

import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_TOKEN } from '$env/tokens/tokens-erc20/tokens.icp.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as USDC_SOL_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import * as tokensErc20Env from '$env/tokens/tokens.erc20.env';
import {
	infuraErc20Providers,
	type InfuraErc20Provider
} from '$eth/providers/infura-erc20.providers';
import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { loadCustomTokens as loadCustomIcrcTokens } from '$icp/services/icrc.services';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import {
	findSuggestedTokensWithBalance,
	saveDeprecatedErc20TokensWithBalance,
	saveSuggestedTokens
} from '$lib/services/suggested-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { Token } from '$lib/types/token';
import type { UserNetworks } from '$lib/types/user-networks';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock('$lib/api/backend.api', () => ({
	setManyCustomTokens: vi.fn().mockResolvedValue(undefined)
}));

vi.mock(import('$eth/services/erc20.services'), async (importOriginal) => ({
	...(await importOriginal()),
	loadCustomTokens: vi.fn().mockResolvedValue(undefined)
}));

vi.mock(import('$icp/services/icrc.services'), async (importOriginal) => ({
	...(await importOriginal()),
	loadCustomTokens: vi.fn().mockResolvedValue(undefined)
}));

vi.mock(import('$sol/services/spl.services'), async (importOriginal) => ({
	...(await importOriginal()),
	loadCustomTokens: vi.fn().mockResolvedValue(undefined)
}));

vi.mock(import('$eth/providers/infura-erc20.providers'), async (importOriginal) => ({
	...(await importOriginal()),
	infuraErc20Providers: vi.fn()
}));

describe('suggested-tokens.services', () => {
	const usdc = { ...USDC_TOKEN, enabled: true };
	const usdcSol = { ...USDC_SOL_TOKEN, enabled: true };

	const balance = (data: bigint) => ({ data, certified: true });

	describe('findSuggestedTokensWithBalance', () => {
		const balances: CertifiedStoreData<BalancesData> = {
			[usdc.id]: balance(100n),
			[usdcSol.id]: balance(5n),
			[LINK_TOKEN.id]: balance(100n)
		};

		it('should find the suggested tokens the user holds a balance in and has no entry for', () => {
			expect(findSuggestedTokensWithBalance({ tokens: [usdc, usdcSol], balances })).toEqual([
				usdc,
				usdcSol
			]);
		});

		it('should skip a suggested token the user has an entry for', () => {
			const usdcWithEntry = { ...usdc, version: 1n };

			expect(findSuggestedTokensWithBalance({ tokens: [usdcWithEntry], balances })).toEqual([]);
		});

		it('should skip a suggested token without a balance', () => {
			expect(
				findSuggestedTokensWithBalance({
					tokens: [usdc, usdcSol],
					balances: { [usdc.id]: balance(ZERO) }
				})
			).toEqual([]);
		});

		it('should skip a suggested token while its balance is unknown', () => {
			expect(findSuggestedTokensWithBalance({ tokens: [usdc], balances: undefined })).toEqual([]);
		});

		it('should skip a token that is not suggested', () => {
			const link = { ...LINK_TOKEN, enabled: true };

			expect(findSuggestedTokensWithBalance({ tokens: [link], balances })).toEqual([]);
		});

		it('should skip a token that cannot be switched on or off', () => {
			const token: Token = USDC_TOKEN;

			expect(findSuggestedTokensWithBalance({ tokens: [token], balances })).toEqual([]);
		});
	});

	describe('saveSuggestedTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should save the tokens as enabled', async () => {
			await saveSuggestedTokens({ identity: mockIdentity, tokens: [usdc, usdcSol] });

			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					expect.objectContaining({
						enabled: true,
						version: toNullable(),
						token: {
							Erc20: { token_address: USDC_TOKEN.address, chain_id: USDC_TOKEN.network.chainId }
						}
					}),
					expect.objectContaining({
						enabled: true,
						version: toNullable(),
						token: {
							SplMainnet: expect.objectContaining({ token_address: USDC_SOL_TOKEN.address })
						}
					})
				]
			});
		});

		it('should reload only the custom tokens of the saved standards', async () => {
			await saveSuggestedTokens({ identity: mockIdentity, tokens: [usdc, usdcSol] });

			expect(loadCustomErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadCustomIcrcTokens).not.toHaveBeenCalled();
		});

		it('should not save without tokens', async () => {
			await saveSuggestedTokens({ identity: mockIdentity, tokens: [] });

			expect(setManyCustomTokens).not.toHaveBeenCalled();
			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});

		it('should neither throw nor reload when the save fails', async () => {
			vi.mocked(setManyCustomTokens).mockRejectedValueOnce(new Error('Version mismatch'));

			await expect(
				saveSuggestedTokens({ identity: mockIdentity, tokens: [usdc] })
			).resolves.toBeUndefined();

			expect(loadCustomErc20Tokens).not.toHaveBeenCalled();
		});
	});

	describe('saveDeprecatedErc20TokensWithBalance', () => {
		const providerMock = mock<InfuraErc20Provider>();

		const userNetworks: UserNetworks = {
			[ICP_TOKEN.network.id]: { enabled: true, isTestnet: false }
		};

		const params = {
			identity: mockIdentity,
			certified: true,
			tokens: [],
			address: mockEthAddress,
			userNetworks
		};

		const savedIcpToken: CustomToken = {
			token: {
				Erc20: {
					token_address: ICP_TOKEN.address.toLowerCase(),
					chain_id: ICP_TOKEN.network.chainId
				}
			},
			version: toNullable(1n),
			enabled: false,
			section: toNullable(),
			allow_external_content_source: toNullable(),
			allowed_external_content_source_urls: toNullable()
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(tokensErc20Env, 'ERC20_DEPRECATED_TOKENS', 'get').mockReturnValue([ICP_TOKEN]);

			providerMock.balance.mockResolvedValue(100n);
			vi.mocked(infuraErc20Providers).mockReturnValue(providerMock);
		});

		it('should save a deprecated token the user holds a balance in and has no entry for', async () => {
			await saveDeprecatedErc20TokensWithBalance(params);

			expect(providerMock.balance).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				contract: ICP_TOKEN
			});

			expect(setManyCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					expect.objectContaining({
						enabled: true,
						version: toNullable(),
						token: {
							Erc20: { token_address: ICP_TOKEN.address, chain_id: ICP_TOKEN.network.chainId }
						}
					})
				]
			});
		});

		it('should skip a deprecated token the user has an entry for', async () => {
			await saveDeprecatedErc20TokensWithBalance({ ...params, tokens: [savedIcpToken] });

			expect(providerMock.balance).not.toHaveBeenCalled();
			expect(setManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should skip a deprecated token without a balance', async () => {
			providerMock.balance.mockResolvedValue(ZERO);

			await saveDeprecatedErc20TokensWithBalance(params);

			expect(setManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should skip a deprecated token whose balance cannot be read', async () => {
			providerMock.balance.mockRejectedValue(new Error('Infura unavailable'));

			await expect(saveDeprecatedErc20TokensWithBalance(params)).resolves.toBeUndefined();

			expect(setManyCustomTokens).not.toHaveBeenCalled();
		});

		it('should not check a deprecated token on a network the user has switched off', async () => {
			await saveDeprecatedErc20TokensWithBalance({
				...params,
				userNetworks: { [ICP_TOKEN.network.id]: { enabled: false, isTestnet: false } }
			});

			expect(providerMock.balance).not.toHaveBeenCalled();
			expect(setManyCustomTokens).not.toHaveBeenCalled();
		});

		it.each([
			{ description: 'on the uncertified token list', override: { certified: false } },
			{ description: 'without an identity', override: { identity: null } },
			{ description: 'without a token list', override: { tokens: undefined } },
			{ description: 'without an Ethereum address', override: { address: undefined } }
		])('should not check $description', async ({ override }) => {
			await saveDeprecatedErc20TokensWithBalance({ ...params, ...override });

			expect(providerMock.balance).not.toHaveBeenCalled();
			expect(setManyCustomTokens).not.toHaveBeenCalled();
		});
	});
});

import type { CustomToken } from '$declarations/backend/backend.did';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { toUserToken } from '$icp-eth/services/user-token.services';
import {
	clearIdbAllCustomTokens,
	clearIdbEthTokensDeprecated,
	deleteIdbAllCustomTokens,
	deleteIdbEthToken,
	deleteIdbEthTokenDeprecated,
	deleteIdbEthTokensDeprecated,
	deleteIdbIcToken,
	deleteIdbSolToken,
	getIdbAllCustomTokens,
	getIdbEthTokensDeprecated,
	setIdbTokensStore
} from '$lib/api/idb-tokens.api';
import * as authServices from '$lib/services/auth.services';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import {
	createMockErc20CustomTokens,
	createMockErc20UserTokens
} from '$tests/mocks/erc20-tokens.mock';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import * as idbKeyval from 'idb-keyval';
import { createStore } from 'idb-keyval';

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('idb-tokens.api', () => {
	const mockIdbTokensStore = createStore('mock-store', 'mock-store');

	const icMockTokens = [
		{
			token: {
				Icrc: {
					ledger_id: Principal.fromText(mockLedgerCanisterId),
					index_id: toNullable(Principal.fromText(mockIndexCanisterId))
				}
			},
			version: toNullable(2n),
			enabled: true
		},
		{
			token: {
				Icrc: {
					ledger_id: Principal.fromText(IC_CKETH_LEDGER_CANISTER_ID),
					index_id: toNullable()
				}
			},
			version: toNullable(1n),
			enabled: false
		}
	] as CustomToken[];
	const splDevnetMockTokens = [
		{
			token: {
				SplDevnet: {
					decimals: toNullable(18),
					symbol: toNullable(),
					token_address: BONK_TOKEN.address
				}
			},
			version: toNullable(),
			enabled: true
		}
	] as CustomToken[];
	const splMainnetMockTokens = [
		{
			token: {
				SplMainnet: {
					decimals: toNullable(18),
					symbol: toNullable(),
					token_address: 'JacMjZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
				}
			},
			version: toNullable(),
			enabled: true
		}
	] as CustomToken[];
	const mockTokens: CustomToken[] = [...icMockTokens, ...splDevnetMockTokens];

	const mockParams = {
		identity: mockIdentity,
		idbTokensStore: mockIdbTokensStore,
		tokens: mockTokens
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setIdbTokensStore', () => {
		it('should not set the tokens in the IDB if the identity is nullish', async () => {
			await setIdbTokensStore({
				...mockParams,
				identity: null
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();

			await setIdbTokensStore({
				...mockParams,
				identity: undefined
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should set the transactions in the IDB', async () => {
			await setIdbTokensStore({
				...mockParams
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockTokens,
				mockIdbTokensStore
			);
		});

		it('should handle emtpy tokens list', async () => {
			await setIdbTokensStore({
				...mockParams,
				tokens: []
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				[],
				mockIdbTokensStore
			);
		});
	});

	describe('getIdbAllCustomTokens', () => {
		it('should get all custom tokens', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockTokens);

			const result = await getIdbAllCustomTokens(mockPrincipal);

			expect(result).toEqual(mockTokens);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('getIdbEthTokensDeprecated', () => {
		it('should get ETH tokens', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockTokens);

			const result = await getIdbEthTokensDeprecated(mockPrincipal);

			expect(result).toEqual(mockTokens);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('deleteIdbAllCustomTokens', () => {
		it('should delete all custom tokens', async () => {
			await deleteIdbAllCustomTokens(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledOnce();
			expect(idbKeyval.del).toHaveBeenNthCalledWith(1, mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('deleteIdbEthTokensDeprecated', () => {
		it('should delete ETH tokens', async () => {
			await deleteIdbEthTokensDeprecated(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledOnce();
			expect(idbKeyval.del).toHaveBeenNthCalledWith(1, mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('deleteIdbEthTokenDeprecated', () => {
		it('should delete provided ETH token', async () => {
			const [tokenToDelete, ...rest] = createMockErc20UserTokens({ n: 3, networkEnv: 'mainnet' });
			const restUserTokens = rest.map(({ data }) => toUserToken(data));
			const userTokenToDelete = toUserToken(tokenToDelete.data);

			vi.mocked(idbKeyval.get).mockResolvedValue([userTokenToDelete, ...restUserTokens]);

			await deleteIdbEthTokenDeprecated({
				identity: mockIdentity,
				token: userTokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				restUserTokens,
				mockIdbTokensStore
			);
		});

		it('should not delete anything if provided ETH token is not in the IDB', async () => {
			const [tokenToDelete, ...rest] = createMockErc20UserTokens({ n: 3, networkEnv: 'mainnet' });
			const restUserTokens = rest.map(({ data }) => toUserToken(data));
			const userTokenToDelete = toUserToken(tokenToDelete.data);

			vi.mocked(idbKeyval.get).mockResolvedValue(restUserTokens);

			await deleteIdbEthTokenDeprecated({
				identity: mockIdentity,
				token: userTokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				restUserTokens,
				mockIdbTokensStore
			);
		});
	});

	describe('deleteIdbEthToken', () => {
		it('should delete provided ETH token', async () => {
			const [tokenToDelete, ...rest] = createMockErc20CustomTokens({ n: 3, networkEnv: 'mainnet' });
			const restUserTokens = rest.map(({ data }) =>
				toCustomToken({ ...data, networkKey: 'Erc20', chainId: data.network.chainId })
			);
			const userTokenToDelete = toCustomToken({
				...tokenToDelete.data,
				networkKey: 'Erc20',
				chainId: tokenToDelete.data.network.chainId
			});

			vi.mocked(idbKeyval.get).mockResolvedValue([userTokenToDelete, ...restUserTokens]);

			await deleteIdbEthToken({
				identity: mockIdentity,
				token: userTokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				restUserTokens,
				mockIdbTokensStore
			);
		});

		it('should not delete anything if provided ETH token is not in the IDB', async () => {
			const [tokenToDelete, ...rest] = createMockErc20CustomTokens({ n: 3, networkEnv: 'mainnet' });
			const restUserTokens = rest.map(({ data }) =>
				toCustomToken({ ...data, networkKey: 'Erc20', chainId: data.network.chainId })
			);
			const userTokenToDelete = toCustomToken({
				...tokenToDelete.data,
				networkKey: 'Erc20',
				chainId: tokenToDelete.data.network.chainId
			});

			vi.mocked(idbKeyval.get).mockResolvedValue(restUserTokens);

			await deleteIdbEthToken({
				identity: mockIdentity,
				token: userTokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				restUserTokens,
				mockIdbTokensStore
			);
		});
	});

	describe('deleteIdbIcToken', () => {
		it('should delete provided IC token', async () => {
			const [tokenToDelete, ...rest] = icMockTokens;

			vi.mocked(idbKeyval.get).mockResolvedValue([tokenToDelete, ...rest]);

			await deleteIdbIcToken({
				identity: mockIdentity,
				token: tokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				rest,
				mockIdbTokensStore
			);
		});

		it('should not delete anything if provided IC token is not in the IDB', async () => {
			const [tokenToDelete, ...rest] = icMockTokens;

			vi.mocked(idbKeyval.get).mockResolvedValue(rest);

			await deleteIdbIcToken({
				identity: mockIdentity,
				token: tokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				rest,
				mockIdbTokensStore
			);
		});

		it('should call nullishSignOur if no identity provided', async () => {
			const signOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();
			const [tokenToDelete, ...rest] = icMockTokens;

			vi.mocked(idbKeyval.get).mockResolvedValue([tokenToDelete, ...rest]);

			await deleteIdbIcToken({
				identity: undefined,
				token: tokenToDelete
			});

			expect(signOutSpy).toHaveBeenCalled();
		});
	});

	describe('deleteIdbSolToken', () => {
		it('should delete provided SPL token', async () => {
			const [tokenToDelete] = splMainnetMockTokens;

			vi.mocked(idbKeyval.get).mockResolvedValue([...splMainnetMockTokens, ...splDevnetMockTokens]);

			await deleteIdbSolToken({
				identity: mockIdentity,
				token: tokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				splDevnetMockTokens,
				mockIdbTokensStore
			);
		});

		it('should not delete anything if provided SPL token is not in the IDB', async () => {
			const tokenToDelete = {
				token: {
					SplDevnet: {
						decimals: toNullable(18),
						symbol: toNullable(),
						token_address: 'token_addresss'
					}
				},
				version: toNullable(),
				enabled: true
			} as CustomToken;

			vi.mocked(idbKeyval.get).mockResolvedValue([...splMainnetMockTokens, ...splDevnetMockTokens]);

			await deleteIdbSolToken({
				identity: mockIdentity,
				token: tokenToDelete
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				[...splMainnetMockTokens, ...splDevnetMockTokens],
				mockIdbTokensStore
			);
		});

		it('should call nullishSignOur if no identity provided', async () => {
			const signOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();

			vi.mocked(idbKeyval.get).mockResolvedValue([...splMainnetMockTokens, ...splDevnetMockTokens]);

			await deleteIdbIcToken({
				identity: undefined,
				token: splMainnetMockTokens[0]
			});

			expect(signOutSpy).toHaveBeenCalled();
		});
	});

	describe('clearIdbAllCustomTokens', () => {
		it('should clear all custom tokens', async () => {
			await clearIdbAllCustomTokens();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});

	describe('clearIdbEthTokensDeprecated', () => {
		it('should clear deprecated ETH tokens', async () => {
			await clearIdbEthTokensDeprecated();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});
});

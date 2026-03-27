import type { CustomToken } from '$declarations/backend/backend.did';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import {
	clearIdbAllCustomTokens,
	deleteIdbEthToken,
	deleteIdbIcToken,
	deleteIdbSolToken,
	getIdbAllCustomTokens,
	setIdbAllCustomTokens,
	setIdbTokensStore
} from '$lib/api/idb-tokens.api';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { createMockErc20CustomTokens } from '$tests/mocks/erc20-tokens.mock';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import * as idbKeyval from 'idb-keyval';
import { createStore } from 'idb-keyval';

vi.mock('$app/environment', () => ({
	browser: true
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

	describe('setIdbAllCustomTokens', () => {
		it('should set all custom tokens using the all-tokens idb store', async () => {
			await setIdbAllCustomTokens({
				identity: mockIdentity,
				tokens: mockTokens
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockTokens,
				mockIdbTokensStore
			);
		});
	});

	describe('deleteIdbEthToken', () => {
		it('should return early with nullish identity', async () => {
			await deleteIdbEthToken({
				identity: null,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();

			await deleteIdbEthToken({
				identity: undefined,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should return early with non-Erc20 token', async () => {
			await deleteIdbEthToken({
				identity: mockIdentity,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should not call set when currentTokens is nullish', async () => {
			const [tokenToDelete] = createMockErc20CustomTokens({ n: 1, networkEnv: 'mainnet' });
			const userTokenToDelete = toCustomToken({
				...tokenToDelete.data,
				networkKey: 'Erc20',
				chainId: tokenToDelete.data.network.chainId
			});

			vi.mocked(idbKeyval.get).mockResolvedValue(undefined);

			await deleteIdbEthToken({
				identity: mockIdentity,
				token: userTokenToDelete
			});

			expect(idbKeyval.get).toHaveBeenCalledOnce();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

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
		it('should return early with nullish identity', async () => {
			await deleteIdbIcToken({
				identity: null,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();

			await deleteIdbIcToken({
				identity: undefined,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should return early with non-Icrc token', async () => {
			await deleteIdbIcToken({
				identity: mockIdentity,
				token: splDevnetMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should not call set when currentTokens is nullish', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(undefined);

			await deleteIdbIcToken({
				identity: mockIdentity,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).toHaveBeenCalledOnce();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

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
	});

	describe('deleteIdbSolToken', () => {
		it('should return early with nullish identity', async () => {
			await deleteIdbSolToken({
				identity: null,
				token: splDevnetMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();

			await deleteIdbSolToken({
				identity: undefined,
				token: splDevnetMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should return early with non-Spl token', async () => {
			await deleteIdbSolToken({
				identity: mockIdentity,
				token: icMockTokens[0]
			});

			expect(idbKeyval.get).not.toHaveBeenCalled();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should not call set when currentTokens is nullish', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(undefined);

			await deleteIdbSolToken({
				identity: mockIdentity,
				token: splDevnetMockTokens[0]
			});

			expect(idbKeyval.get).toHaveBeenCalledOnce();
			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

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
	});

	describe('clearIdbAllCustomTokens', () => {
		it('should clear all custom tokens', async () => {
			await clearIdbAllCustomTokens();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});
});

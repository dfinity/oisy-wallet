import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_TOKEN_GROUP } from '$env/tokens/groups/groups.btc.env';
import { ETH_TOKEN_GROUP, ETH_TOKEN_GROUP_ID } from '$env/tokens/groups/groups.eth.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { Token, TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import { last } from '$lib/utils/array.utils';
import { normalizeTokenToDecimals } from '$lib/utils/parse.utils';
import {
	filterTokenGroups,
	groupSecondaryToken,
	groupTokens,
	groupTokensByTwin,
	sortTokenOrGroupUi,
	updateTokenGroup
} from '$lib/utils/token-group.utils';
import { bn1Bi, bn2Bi, bn3Bi } from '$tests/mocks/balances.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';

const tokens: TokenUi[] = [
	{
		...BTC_MAINNET_TOKEN,
		balance: bn1Bi,
		usdBalance: 50000
	},
	{
		...mockValidIcCkToken,
		symbol: 'ckBTC',
		network: ICP_NETWORK,
		balance: bn2Bi,
		usdBalance: 100000,
		standard: 'icrc',
		category: 'default',
		decimals: BTC_MAINNET_TOKEN.decimals,
		name: 'Chain key Bitcoin',
		groupData: BTC_TOKEN_GROUP
	},
	{
		...ETHEREUM_TOKEN,
		balance: 10n,
		usdBalance: 20000
	},
	{
		...mockValidIcCkToken,
		symbol: 'ckETH',
		network: ICP_NETWORK,
		balance: 5n,
		usdBalance: 15000,
		standard: 'icrc',
		category: 'default',
		decimals: ETHEREUM_TOKEN.decimals,
		name: 'Chain key Ethereum',
		groupData: ETH_TOKEN_GROUP
	},
	{
		...ICP_TOKEN,
		balance: 50n,
		usdBalance: 1000
	}
];

const reorderedTokens = [
	tokens[1], // ckBTC
	tokens[0], // BTC
	tokens[3], // ckETH
	tokens[2], // ETH
	tokens[4] // ICP
];

describe('token-group.utils', () => {
	describe('groupTokensByTwin', () => {
		it('should group tokens with matching group ID', () => {
			const groupedTokens = groupTokensByTwin(tokens);

			expect(groupedTokens).toHaveLength(3);

			const [btcGroup, _, icpToken] = groupedTokens;

			expect(btcGroup).toHaveProperty('group');

			assert('group' in btcGroup);

			expect(btcGroup.group.tokens).toHaveLength(2);
			expect(btcGroup.group.tokens.map((t) => t.symbol)).toContain('BTC');
			expect(btcGroup.group.tokens.map((t) => t.symbol)).toContain('ckBTC');

			expect(icpToken).toHaveProperty('token.symbol', 'ICP');
		});

		it('should handle tokens without twinTokenSymbol', () => {
			const tokensWithoutTwins = [ICP_TOKEN];
			const groupedTokens = groupTokensByTwin(tokensWithoutTwins);

			expect(groupedTokens).toHaveLength(1);

			const [firstGroup] = groupedTokens;

			expect(firstGroup).toHaveProperty('token.symbol', 'ICP');
		});

		it('should place the group in the position of the first token', () => {
			const groupedTokens = groupTokensByTwin(tokens);
			const [firstGroup] = groupedTokens;

			expect(firstGroup).toHaveProperty('group');

			assert('group' in firstGroup);

			expect(firstGroup.group.tokens.map((t) => t.symbol)).toContain('BTC');
			expect(firstGroup.group.tokens.map((t) => t.symbol)).toContain('ckBTC');
		});

		it('should not duplicate tokens in the result', () => {
			const groupedTokens = groupTokensByTwin(tokens);

			const tokenSymbols = groupedTokens.flatMap((groupOrToken) =>
				'group' in groupOrToken
					? groupOrToken.group.tokens.map((t) => t.symbol)
					: [groupOrToken.token.symbol]
			);
			const uniqueSymbols = new Set(tokenSymbols);

			expect(uniqueSymbols.size).toBe(tokenSymbols.length);
		});

		it('should correctly group tokens even when the ckToken is declared before the native token', () => {
			const groupedTokens = groupTokensByTwin(reorderedTokens);

			expect(groupedTokens).toHaveLength(3);

			const btcGroup = groupedTokens.find(
				(groupOrToken) =>
					'group' in groupOrToken && groupOrToken.group.tokens.some((t) => t.symbol === 'BTC')
			);

			expect(btcGroup).toBeDefined();

			assertNonNullish(btcGroup);
			assert('group' in btcGroup);

			expect(btcGroup.group.tokens).toHaveLength(2);
			expect(btcGroup.group.tokens.map((t) => t.symbol)).toContain('BTC');
			expect(btcGroup.group.tokens.map((t) => t.symbol)).toContain('ckBTC');

			const ethGroup = groupedTokens.find(
				(groupOrToken) =>
					'group' in groupOrToken && groupOrToken.group.tokens.some((t) => t.symbol === 'ETH')
			);

			expect(ethGroup).toBeDefined();

			assertNonNullish(ethGroup);
			assert('group' in ethGroup);

			expect(ethGroup.group.tokens).toHaveLength(2);
			expect(ethGroup.group.tokens.map((t) => t.symbol)).toContain('ETH');
			expect(ethGroup.group.tokens.map((t) => t.symbol)).toContain('ckETH');

			const icpToken = groupedTokens.find((t) => 'token' in t && t.token.symbol === 'ICP');

			expect(icpToken).toBeDefined();
		});

		it('should re-sort groups if their total USD balance made them out of order', () => {
			const reorderedTokens = [
				{ ...tokens[0], usdBalance: 5 }, // BTC
				{ ...tokens[2], usdBalance: 4 }, // ETH
				{ ...tokens[3], usdBalance: 3 }, // ckETH
				{ ...tokens[4], usdBalance: 0 }, // ICP
				{ ...tokens[1], usdBalance: 0 } // ckBTC
			];

			const groupedTokens = groupTokensByTwin(reorderedTokens as TokenUi[]);

			expect(groupedTokens).toHaveLength(3);

			expect(groupedTokens[0]).toHaveProperty('group.tokens', [
				reorderedTokens[1],
				reorderedTokens[2]
			]);
			expect(groupedTokens[1]).toHaveProperty('group.tokens', [
				reorderedTokens[0],
				reorderedTokens[4]
			]);
		});

		it('should re-sort groups if their total balance made them out of order', () => {
			const reorderedTokens = [
				{ ...tokens[0], balance: bn2Bi, usdBalance: 0 }, // BTC
				{ ...tokens[2], balance: bn2Bi, usdBalance: 0 }, // ETH
				{ ...tokens[3], balance: bn1Bi, usdBalance: 0 }, // ckETH
				{ ...tokens[1], balance: ZERO, usdBalance: 0 } // ckBTC
			];

			const groupedTokens = groupTokensByTwin(reorderedTokens as TokenUi[]);

			expect(groupedTokens).toHaveLength(2);

			expect(groupedTokens[0]).toHaveProperty('group.tokens', [
				reorderedTokens[1],
				reorderedTokens[2]
			]);
			expect(groupedTokens[1]).toHaveProperty('group.tokens', [
				reorderedTokens[0],
				reorderedTokens[3]
			]);
		});
	});

	describe('filterTokenGroups', () => {
		const reorderedTokens = [
			{ ...tokens[0], balance: ZERO, usdBalance: 0 }, // BTC
			{ ...tokens[4], balance: ZERO, usdBalance: 0 }, // ICP
			{ ...tokens[1], balance: ZERO, usdBalance: 0 } // ckBTC
		];

		it('should give me all token groups', () => {
			const groupedTokens = groupTokensByTwin(reorderedTokens as TokenUi[]);

			const filteredTokenGroups = filterTokenGroups({ groupedTokens, showZeroBalances: true });

			expect(filteredTokenGroups).toEqual(groupedTokens);
		});

		it('should give me only token groups where at least one token has a balance', () => {
			const customReorderedTokens = [
				...reorderedTokens,
				{ ...tokens[2], balance: bn2Bi, usdBalance: 0 }, // ETH
				{ ...tokens[3], balance: ZERO, usdBalance: 0 } // ckETH
			];
			const groupedTokens = groupTokensByTwin(customReorderedTokens as TokenUi[]);

			const filteredTokenGroups = filterTokenGroups({ groupedTokens, showZeroBalances: false });

			expect(filteredTokenGroups).toHaveLength(1);

			expect(filteredTokenGroups[0]).toHaveProperty('group.tokens', [
				customReorderedTokens[3],
				customReorderedTokens[4]
			]);
		});

		it('should give me only token groups where at least one token has a usd balance', () => {
			const customReorderedTokens = [
				...reorderedTokens,
				{ ...tokens[2], balance: ZERO, usdBalance: 0 }, // ETH
				{ ...tokens[3], balance: ZERO, usdBalance: 1 } // ckETH
			];
			const groupedTokens = groupTokensByTwin(customReorderedTokens as TokenUi[]);

			const filteredTokenGroups = filterTokenGroups({ groupedTokens, showZeroBalances: false });

			expect(filteredTokenGroups).toHaveLength(1);

			expect(filteredTokenGroups[0]).toHaveProperty('group.tokens', [
				customReorderedTokens[3],
				customReorderedTokens[4]
			]);
		});
	});

	describe('updateTokenGroup', () => {
		const token = {
			...ETHEREUM_TOKEN,
			groupData: ETH_TOKEN_GROUP,
			balance: bn1Bi,
			usdBalance: 100
		};
		const anotherToken = {
			...BASE_ETH_TOKEN,
			groupData: ETH_TOKEN_GROUP,
			balance: bn2Bi,
			usdBalance: 200
		};

		const tokenGroup: TokenUiGroup = {
			id: anotherToken.groupData.id,
			decimals: anotherToken.decimals,
			groupData: anotherToken.groupData,
			tokens: [anotherToken],
			balance: anotherToken.balance,
			usdBalance: anotherToken.usdBalance
		};

		const expectedDecimals = Math.max(anotherToken.decimals, token.decimals);

		const expectedBalance =
			normalizeTokenToDecimals({
				value: anotherToken.balance,
				oldUnitName: anotherToken.decimals,
				newUnitName: expectedDecimals
			}) +
			normalizeTokenToDecimals({
				value: token.balance,
				oldUnitName: token.decimals,
				newUnitName: expectedDecimals
			});

		const expectedGroup: TokenUiGroup = {
			...tokenGroup,
			decimals: expectedDecimals,
			tokens: [anotherToken, token],
			balance: expectedBalance,
			usdBalance: anotherToken.usdBalance + token.usdBalance
		};

		it('should add a token to a token group successfully', () => {
			expect(updateTokenGroup({ token, tokenGroup })).toStrictEqual(expectedGroup);
		});

		it('should add a token to a token group with multiple tokens successfully', () => {
			const thirdToken = {
				...BTC_TESTNET_TOKEN,
				decimals: expectedDecimals,
				groupData: ETH_TOKEN_GROUP,
				balance: bn3Bi,
				usdBalance: 300
			};

			const initialGroup = updateTokenGroup({ token: thirdToken, tokenGroup });

			const updatedGroup = updateTokenGroup({ token, tokenGroup: initialGroup });

			expect(updatedGroup).toStrictEqual({
				...tokenGroup,
				tokens: [anotherToken, thirdToken, token],
				balance: expectedBalance + thirdToken.balance,
				usdBalance: anotherToken.usdBalance + thirdToken.usdBalance + token.usdBalance
			});
		});

		it('should handle nullish balances in tokenGroup correctly', () => {
			expect(
				updateTokenGroup({
					token,
					tokenGroup: { ...tokenGroup, balance: undefined }
				})
			).toStrictEqual({ ...expectedGroup, balance: undefined });

			expect(
				updateTokenGroup({
					token,
					tokenGroup: { ...tokenGroup, balance: null }
				})
			).toStrictEqual({ ...expectedGroup, balance: token.balance });

			expect(
				updateTokenGroup({
					token,
					tokenGroup: { ...tokenGroup, usdBalance: undefined }
				})
			).toStrictEqual({ ...expectedGroup, usdBalance: token.usdBalance });
		});

		it('should handle nullish balances in token correctly', () => {
			expect(
				updateTokenGroup({
					token: { ...token, balance: undefined },
					tokenGroup
				})
			).toStrictEqual({
				...expectedGroup,
				tokens: [anotherToken, { ...token, balance: undefined }],
				balance: undefined
			});

			expect(
				updateTokenGroup({
					token: { ...token, balance: null },
					tokenGroup
				})
			).toStrictEqual({
				...expectedGroup,
				tokens: [anotherToken, { ...token, balance: null }],
				balance: tokenGroup.balance
			});

			expect(
				updateTokenGroup({
					token: { ...token, usdBalance: undefined },
					tokenGroup
				})
			).toStrictEqual({
				...expectedGroup,
				tokens: [anotherToken, { ...token, usdBalance: undefined }],
				usdBalance: tokenGroup.usdBalance
			});
		});

		it('should handle tokens with different decimals', () => {
			assertNonNullish(tokenGroup.usdBalance);

			const newDecimals = expectedGroup.decimals * 2;

			const newToken = { ...token, decimals: newDecimals };

			const initialGroup = updateTokenGroup({
				token: newToken,
				tokenGroup
			});

			const expectedBalance =
				normalizeTokenToDecimals({
					value: anotherToken.balance,
					oldUnitName: anotherToken.decimals,
					newUnitName: newDecimals
				}) + newToken.balance;

			expect(initialGroup).toStrictEqual({
				...tokenGroup,
				decimals: newDecimals,
				tokens: [...tokenGroup.tokens, newToken],
				balance: expectedBalance,
				usdBalance: tokenGroup.usdBalance + newToken.usdBalance
			});

			const thirdToken = {
				...BTC_TESTNET_TOKEN,
				decimals: newDecimals * 2,
				groupData: ETH_TOKEN_GROUP,
				balance: bn3Bi,
				usdBalance: 300
			};

			const updatedGroup = updateTokenGroup({ token: thirdToken, tokenGroup: initialGroup });

			assertNonNullish(initialGroup.balance);

			expect(updatedGroup).toStrictEqual({
				...initialGroup,
				decimals: newDecimals * 2,
				tokens: [...initialGroup.tokens, thirdToken],
				balance:
					normalizeTokenToDecimals({
						value: initialGroup.balance,
						oldUnitName: initialGroup.decimals,
						newUnitName: newDecimals * 2
					}) + thirdToken.balance,
				usdBalance: anotherToken.usdBalance + thirdToken.usdBalance + token.usdBalance
			});
		});
	});

	describe('groupSecondaryToken', () => {
		// We normalize the decimals, to avoid having to mock the normalizing of balances
		const { decimals } = ETHEREUM_TOKEN;

		const token = { ...ETHEREUM_TOKEN, decimals, balance: bn1Bi, usdBalance: 100 };
		const anotherToken = { ...BTC_REGTEST_TOKEN, decimals, balance: bn2Bi, usdBalance: 200 };

		// We mock the tokens to have the same group data
		const twinToken = {
			...SOLANA_TOKEN,
			decimals,
			balance: bn2Bi,
			usdBalance: 250,
			groupData: ETH_TOKEN_GROUP
		};

		it('should create a new group when no tokenGroup exists', () => {
			expect(groupSecondaryToken({ token: twinToken, tokenGroup: undefined })).toEqual({
				id: ETH_TOKEN_GROUP_ID,
				decimals,
				groupData: ETH_TOKEN_GROUP,
				tokens: [twinToken],
				balance: twinToken.balance,
				usdBalance: twinToken.usdBalance
			});
		});

		it('should add token to existing group and update balances', () => {
			const tokenGroup: TokenUiGroup = {
				id: ETH_TOKEN_GROUP_ID,
				decimals,
				groupData: ETH_TOKEN_GROUP,
				tokens: [token],
				balance: bn3Bi,
				usdBalance: 300
			};

			assertNonNullish(tokenGroup.balance);
			assertNonNullish(tokenGroup.usdBalance);

			expect(groupSecondaryToken({ token: twinToken, tokenGroup })).toEqual({
				...tokenGroup,
				tokens: [...tokenGroup.tokens, twinToken],
				balance: tokenGroup.balance + twinToken.balance,
				usdBalance: tokenGroup.usdBalance + twinToken.usdBalance
			});
		});

		it('should add token to existing group with more than one token already', () => {
			assertNonNullish(token.groupData);

			const tokenGroup: TokenUiGroup = {
				id: token.groupData.id,
				decimals,
				groupData: token.groupData,
				tokens: [token, anotherToken],
				balance: bn3Bi,
				usdBalance: 300
			};

			assertNonNullish(tokenGroup.balance);
			assertNonNullish(tokenGroup.usdBalance);

			expect(groupSecondaryToken({ token: twinToken, tokenGroup })).toEqual({
				...tokenGroup,
				tokens: [...tokenGroup.tokens, twinToken],
				balance: tokenGroup.balance + twinToken.balance,
				usdBalance: tokenGroup.usdBalance + twinToken.usdBalance
			});
		});
	});

	describe('groupTokens', () => {
		// We normalize the decimals, to avoid having to mock the normalizing of balances
		const { decimals } = ETHEREUM_TOKEN;

		const mockToken = { ...ETHEREUM_TOKEN, decimals, balance: bn1Bi, usdBalance: 100 };
		const mockSecondToken = { ...BTC_MAINNET_TOKEN, decimals, balance: bn3Bi, usdBalance: 300 };
		const mockThirdToken = { ...ICP_TOKEN, decimals, balance: bn2Bi, usdBalance: 200 };

		// We mock the tokens to have the same "main token"
		const mockTwinToken1 = {
			...mockValidIcToken,
			decimals,
			balance: bn2Bi,
			usdBalance: 250,
			groupData: mockToken.groupData
		};
		const mockTwinToken2 = {
			...mockValidIcToken,
			decimals,
			balance: bn1Bi,
			usdBalance: 450,
			groupData: mockToken.groupData
		};

		it('should return an empty array if no tokens are provided', () => {
			expect(groupTokens([])).toHaveLength(0);
		});

		it('should not create groups if no token can be grouped', () => {
			const tokens = [
				{ ...mockToken, groupData: undefined },
				{ ...mockSecondToken, groupData: undefined },
				{ ...mockThirdToken, groupData: undefined }
			];

			const result = groupTokens(tokens);

			expect(result).toHaveLength(tokens.length);

			result.forEach((tokenResult, index) => {
				expect(tokenResult).toHaveProperty('token');

				assert('token' in tokenResult);

				expect(tokenResult.token).toEqual(tokens[index]);
			});
		});

		it('should create groups of single-element tokens if they have group data but alone', () => {
			const tokens = [mockToken, mockSecondToken, mockThirdToken];

			const result = groupTokens(tokens);

			expect(result).toHaveLength(tokens.length);

			result.slice(0, -1).forEach((tokenResult, index) => {
				const currentToken = tokens[index];

				expect(tokenResult).toHaveProperty('group');

				assert('group' in tokenResult);

				const { group } = tokenResult;

				expect(group).toEqual({
					id: currentToken.groupData?.id,
					decimals: currentToken.decimals,
					groupData: currentToken.groupData,
					tokens: [currentToken],
					balance: currentToken.balance,
					usdBalance: currentToken.usdBalance
				});
			});

			expect(last(result)).toHaveProperty('token');
		});

		it('should group tokens with the same group data', () => {
			const tokens = [mockToken, mockTwinToken1, mockSecondToken, mockTwinToken2];

			const result = groupTokens(tokens);

			expect(result).toHaveLength(2);

			result.forEach((groupResult) => {
				expect(groupResult).toHaveProperty('group');
			});

			assert('group' in result[0]);
			assert('group' in result[1]);

			const [{ group: group0 }, { group: group1 }] = result;

			expect(group0).toStrictEqual({
				id: mockToken.groupData?.id,
				decimals,
				groupData: mockToken.groupData,
				tokens: [mockToken, mockTwinToken1, mockTwinToken2],
				balance: mockToken.balance + mockTwinToken1.balance + mockTwinToken2.balance,
				usdBalance: mockToken.usdBalance + mockTwinToken1.usdBalance + mockTwinToken2.usdBalance
			});

			expect(group1).toStrictEqual({
				id: mockSecondToken.groupData?.id,
				decimals: mockSecondToken.decimals,
				groupData: mockSecondToken.groupData,
				tokens: [mockSecondToken],
				balance: mockSecondToken.balance,
				usdBalance: mockSecondToken.usdBalance
			});
		});

		it('should group tokens with the same group data respecting the order they arrive in', () => {
			const tokens = [mockTwinToken1, mockSecondToken, mockToken, mockTwinToken2];

			const result = groupTokens(tokens);

			expect(result).toHaveLength(2);

			result.forEach((groupResult) => {
				expect(groupResult).toHaveProperty('group');
			});

			assert('group' in result[0]);
			assert('group' in result[1]);

			const [{ group: group0 }, { group: group1 }] = result;

			expect(group0).toStrictEqual({
				id: mockTwinToken1.groupData?.id,
				decimals,
				groupData: mockTwinToken1.groupData,
				tokens: [mockTwinToken1, mockToken, mockTwinToken2],
				balance: mockTwinToken1.balance + mockToken.balance + mockTwinToken2.balance,
				usdBalance: mockTwinToken1.usdBalance + mockToken.usdBalance + mockTwinToken2.usdBalance
			});

			expect(group1).toStrictEqual({
				id: mockSecondToken.groupData?.id,
				decimals,
				groupData: mockSecondToken.groupData,
				tokens: [mockSecondToken],
				balance: mockSecondToken.balance,
				usdBalance: mockSecondToken.usdBalance
			});
		});

		it('should not re-sort the groups even if the total balance of a group would put it in a higher position in the list', () => {
			// We mock the tokens to have the same "main token"
			const tokens = [mockSecondToken, mockToken, mockTwinToken1, mockTwinToken2];

			const result = groupTokens(tokens);

			expect(result).toHaveLength(2);

			result.forEach((groupResult) => {
				expect(groupResult).toHaveProperty('group');
			});

			assert('group' in result[0]);
			assert('group' in result[1]);

			const [{ group: group0 }, { group: group1 }] = result;

			expect(group0).toStrictEqual({
				id: mockSecondToken.groupData?.id,
				decimals,
				groupData: mockSecondToken.groupData,
				tokens: [mockSecondToken],
				balance: mockSecondToken.balance,
				usdBalance: mockSecondToken.usdBalance
			});

			expect(group1).toStrictEqual({
				id: mockToken.groupData?.id,
				decimals,
				groupData: mockToken.groupData,
				tokens: [mockToken, mockTwinToken1, mockTwinToken2],
				balance: mockToken.balance + mockTwinToken1.balance + mockTwinToken2.balance,
				usdBalance: mockToken.usdBalance + mockTwinToken1.usdBalance + mockTwinToken2.usdBalance
			});
		});

		it('should group with balance undefined if any of the tokens has balance undefined', () => {
			const mockTwinToken = {
				...mockTwinToken1,
				balance: undefined,
				usdBalance: undefined
			};

			const tokens = [mockToken, mockTwinToken, mockTwinToken2];

			const result = groupTokens(tokens);

			expect(result).toHaveLength(1);

			assert('group' in result[0]);

			const [{ group }] = result;

			expect(group).toStrictEqual({
				id: mockToken.groupData?.id,
				decimals,
				groupData: mockToken.groupData,
				tokens: [mockToken, mockTwinToken, mockTwinToken2],
				balance: undefined,
				usdBalance: mockToken.usdBalance + mockTwinToken2.usdBalance
			});
		});
	});

	describe('sortTokenOrGroupUi', () => {
		const toTokenUiOrGroupUi = (token: Token): TokenUiOrGroupUi => ({ token });

		const mockToken = toTokenUiOrGroupUi({ ...ETHEREUM_TOKEN, name: 'Aaa' });
		const mockSecondToken = toTokenUiOrGroupUi({ ...BTC_MAINNET_TOKEN, name: 'Bbb' });
		const mockThirdToken = toTokenUiOrGroupUi({ ...ICP_TOKEN, name: 'Ccc' });
		const mockFourthToken = toTokenUiOrGroupUi({ ...ICP_TOKEN, name: '--- AAA' });

		const tokenList = [mockToken, mockSecondToken, mockThirdToken, mockFourthToken]
			.map((value) => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value);
		// map().sort().map() is used to shuffle the array randomly

		it('should sort correctly', () => {
			const result = sortTokenOrGroupUi(tokenList);

			expect(result).toEqual([mockToken, mockSecondToken, mockThirdToken, mockFourthToken]);
		});

		it('should keep order the same if groups passed', () => {
			const expected = [
				{ group: { id: 'Bgroup1', tokens: [mockToken] } as unknown as TokenUiGroup },
				{
					group: {
						id: 'Agroup1',
						tokens: [mockSecondToken, mockThirdToken]
					} as unknown as TokenUiGroup
				}
			];
			const result = sortTokenOrGroupUi(expected);

			expect(result).toEqual(expected);
		});
	});
});

import { ICP_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup } from '$lib/types/token-group';
import {
	groupSecondaryToken,
	groupTokens,
	groupTokensByTwin,
	updateTokenGroup
} from '$lib/utils/token-group.utils';
import { bn1, bn2, bn3 } from '$tests/mocks/balances.mock';
import { BigNumber } from 'alchemy-sdk';
import { describe, expect, it } from 'vitest';

const tokens = [
	{
		...BTC_MAINNET_TOKEN,
		balance: BigNumber.from(1),
		usdBalance: 50000
	},
	{
		symbol: 'ckBTC',
		network: ICP_NETWORK,
		balance: BigNumber.from(2),
		usdBalance: 100000,
		standard: 'icrc',
		category: 'default',
		decimals: 8,
		name: 'Chain key Bitcoin',
		minterCanisterId: 'mc6ru-gyaaa-aaaar-qaaaq-cai'
	},
	{
		...ETHEREUM_TOKEN,
		balance: BigNumber.from(10),
		usdBalance: 20000
	},
	{
		symbol: 'ckETH',
		network: ICP_NETWORK,
		balance: BigNumber.from(5),
		usdBalance: 15000,
		standard: 'icrc',
		category: 'default',
		decimals: 18,
		name: 'Chain key Ethereum',
		minterCanisterId: 'apia6-jaaaa-aaaar-qabma-cai'
	},
	{
		...ICP_TOKEN,
		balance: BigNumber.from(50),
		usdBalance: 1000
	}
];

const tokensWithMismatchedDecimals = [
	...tokens,
	{
		symbol: 'FOO',
		network: {
			id: Symbol('FOO'),
			name: 'Foo Network',
			icon: 'foo-icon',
			iconBW: 'foo-icon-bw',
			env: 'mainnet'
		},
		twinTokenSymbol: 'ckFOO',
		balance: BigNumber.from(100),
		usdBalance: 1000,
		standard: 'ethereum',
		category: 'default',
		decimals: 8,
		name: 'Foo Token'
	},
	{
		symbol: 'ckFOO',
		network: ICP_NETWORK,
		balance: BigNumber.from(200),
		usdBalance: 2000,
		standard: 'icrc',
		category: 'default',
		decimals: 9, // Mismatched decimals
		name: 'Chain key Foo Token',
		minterCanisterId: 'ckfoo-canister-id'
	}
];

const reorderedTokens = [
	tokens[1], // ckBTC
	tokens[0], // BTC
	tokens[3], // ckETH
	tokens[2], // ETH
	tokens[4] // ICP
];

describe('groupTokensByTwin', () => {
	it('should group tokens with matching twinTokenSymbol', () => {
		const groupedTokens = groupTokensByTwin(tokens as TokenUi[]);
		expect(groupedTokens).toHaveLength(3);

		const btcGroup = groupedTokens[0];
		expect(btcGroup).toHaveProperty('tokens');
		expect((btcGroup as TokenUiGroup).tokens).toHaveLength(2);
		expect((btcGroup as TokenUiGroup).tokens.map((t) => t.symbol)).toContain('BTC');
		expect((btcGroup as TokenUiGroup).tokens.map((t) => t.symbol)).toContain('ckBTC');

		const icpToken = groupedTokens[2];
		expect(icpToken).toHaveProperty('symbol', 'ICP');
	});

	it('should handle tokens without twinTokenSymbol', () => {
		const tokensWithoutTwins = [ICP_TOKEN];
		const groupedTokens = groupTokensByTwin(tokensWithoutTwins);

		expect(groupedTokens).toHaveLength(1);
		expect(groupedTokens[0]).toHaveProperty('symbol', 'ICP');
	});

	it('should place the group in the position of the first token', () => {
		const groupedTokens = groupTokensByTwin(tokens as TokenUi[]);
		const firstGroup = groupedTokens[0];
		expect(firstGroup).toHaveProperty('tokens');
		expect((firstGroup as TokenUiGroup).tokens.map((t) => t.symbol)).toContain('BTC');
		expect((firstGroup as TokenUiGroup).tokens.map((t) => t.symbol)).toContain('ckBTC');
	});

	it('should not duplicate tokens in the result', () => {
		const groupedTokens = groupTokensByTwin(tokens as TokenUi[]);

		const tokenSymbols = groupedTokens.flatMap((groupOrToken) =>
			'tokens' in groupOrToken ? groupOrToken.tokens.map((t) => t.symbol) : [groupOrToken.symbol]
		);
		const uniqueSymbols = new Set(tokenSymbols);
		expect(uniqueSymbols.size).toBe(tokenSymbols.length);
	});

	it('should not group tokens when their decimals are mismatched', () => {
		const groupedTokens = groupTokensByTwin(tokensWithMismatchedDecimals as TokenUi[]);
		expect(groupedTokens).toHaveLength(5);

		const fooToken = groupedTokens.find((t) => 'symbol' in t && t.symbol === 'FOO');
		const ckFooToken = groupedTokens.find((t) => 'symbol' in t && t.symbol === 'ckFOO');

		expect(fooToken).toBeDefined();
		expect(ckFooToken).toBeDefined();

		expect(fooToken).not.toHaveProperty('tokens');
		expect(ckFooToken).not.toHaveProperty('tokens');
	});

	it('should correctly group tokens even when the ckToken is declared before the native token', () => {
		const groupedTokens = groupTokensByTwin(reorderedTokens as TokenUi[]);

		expect(groupedTokens).toHaveLength(3);

		const btcGroup = groupedTokens.find(
			(groupOrToken) =>
				'tokens' in groupOrToken && groupOrToken.tokens.some((t) => t.symbol === 'BTC')
		) as TokenUiGroup;

		expect(btcGroup).toBeDefined();
		expect(btcGroup.tokens).toHaveLength(2);
		expect(btcGroup.tokens.map((t) => t.symbol)).toContain('BTC');
		expect(btcGroup.tokens.map((t) => t.symbol)).toContain('ckBTC');

		const ethGroup = groupedTokens.find(
			(groupOrToken) =>
				'tokens' in groupOrToken && groupOrToken.tokens.some((t) => t.symbol === 'ETH')
		) as TokenUiGroup;

		expect(ethGroup).toBeDefined();
		expect(ethGroup.tokens).toHaveLength(2);
		expect(ethGroup.tokens.map((t) => t.symbol)).toContain('ETH');
		expect(ethGroup.tokens.map((t) => t.symbol)).toContain('ckETH');

		const icpToken = groupedTokens.find((t) => 'symbol' in t && t.symbol === 'ICP');

		expect(icpToken).toBeDefined();
	});
});

describe('updateTokenGroup', () => {
	const token = { ...ICP_TOKEN, balance: bn1, usdBalance: 100 };
	const anotherToken = { ...SEPOLIA_TOKEN, balance: bn2, usdBalance: 200 };

	const tokenGroup: TokenUiGroup = {
		id: anotherToken.id,
		nativeToken: anotherToken,
		tokens: [anotherToken],
		balance: anotherToken.balance,
		usdBalance: anotherToken.usdBalance
	};

	const expectedGroup: TokenUiGroup = {
		...tokenGroup,
		tokens: [anotherToken, token],
		balance: anotherToken.balance.add(token.balance),
		usdBalance: anotherToken.usdBalance + token.usdBalance
	};

	it('should add a token to a token group successfully', () => {
		expect(updateTokenGroup({ token, tokenGroup })).toStrictEqual(expectedGroup);
	});

	it('should add a token to a token group with multiple tokens successfully', () => {
		const thirdToken = { ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 };

		const initialGroup = updateTokenGroup({ token: thirdToken, tokenGroup });

		const updatedGroup = updateTokenGroup({ token, tokenGroup: initialGroup });

		expect(updatedGroup).toStrictEqual({
			...tokenGroup,
			tokens: [anotherToken, thirdToken, token],
			balance: anotherToken.balance.add(thirdToken.balance).add(token.balance),
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
});

describe('groupSecondaryToken', () => {
	const token = { ...ICP_TOKEN, balance: bn1, usdBalance: 100 };
	const anotherToken = { ...BTC_REGTEST_TOKEN, balance: bn2, usdBalance: 200 };

	// We mock the tokens to have the same "main token"
	const twinToken = {
		...SEPOLIA_TOKEN,
		balance: bn2,
		usdBalance: 250,
		twinToken: ICP_TOKEN,
		decimals: ICP_TOKEN.decimals
	};

	it('creates a new group when no tokenGroup exists', () => {
		expect(groupSecondaryToken({ token: twinToken, tokenGroup: undefined })).toEqual({
			id: twinToken.id,
			nativeToken: twinToken,
			tokens: [twinToken],
			balance: twinToken.balance,
			usdBalance: twinToken.usdBalance
		});
	});

	it('adds token to existing group and updates balances', () => {
		const tokenGroup: TokenUiGroup = {
			id: token.id,
			nativeToken: token,
			tokens: [token],
			balance: bn3,
			usdBalance: 300
		};

		expect(groupSecondaryToken({ token: twinToken, tokenGroup })).toEqual({
			...tokenGroup,
			tokens: [...tokenGroup.tokens, twinToken],
			balance: tokenGroup.balance!.add(twinToken.balance),
			usdBalance: tokenGroup.usdBalance! + twinToken.usdBalance
		});
	});

	it('adds token to existing group with more than one token already', () => {
		const tokenGroup: TokenUiGroup = {
			id: token.id,
			nativeToken: token,
			tokens: [token, anotherToken],
			balance: bn3,
			usdBalance: 300
		};

		expect(groupSecondaryToken({ token: twinToken, tokenGroup })).toEqual({
			...tokenGroup,
			tokens: [...tokenGroup.tokens, twinToken],
			balance: tokenGroup.balance!.add(twinToken.balance),
			usdBalance: tokenGroup.usdBalance! + twinToken.usdBalance
		});
	});
});

describe('groupTokens', () => {
	const token = { ...ICP_TOKEN, balance: bn1, usdBalance: 100 };
	const anotherToken = { ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 };
	const thirdToken = { ...SEPOLIA_TOKEN, balance: bn2, usdBalance: 200 };

	// We mock the tokens to have the same "main token"
	const twinToken1 = {
		...SEPOLIA_TOKEN,
		balance: bn2,
		usdBalance: 250,
		twinToken: token,
		decimals: token.decimals
	};
	const twinToken2 = {
		...BTC_REGTEST_TOKEN,
		balance: bn1,
		usdBalance: 450,
		twinToken: token,
		decimals: token.decimals
	};

	it('should return an empty array if no tokens are provided', () => {
		expect(groupTokens([]).length).toBe(0);
	});

	it('should create groups of single-element tokens if none of them have a "main token"', () => {
		const tokens = [token, anotherToken, thirdToken];

		const result = groupTokens(tokens);

		expect(result.length).toBe(3);

		result.map((group) => {
			expect(group.tokens.length).toBe(1);
		});

		expect(result[0].id).toBe(token.id);
		expect(result[1].id).toBe(anotherToken.id);
		expect(result[2].id).toBe(thirdToken.id);

		expect(result[0].nativeToken).toBe(token);
		expect(result[1].nativeToken).toBe(anotherToken);
		expect(result[2].nativeToken).toBe(thirdToken);

		expect(result[0].balance).toBe(token.balance);
		expect(result[1].balance).toBe(anotherToken.balance);
		expect(result[2].balance).toBe(thirdToken.balance);

		expect(result[0].usdBalance).toBe(token.usdBalance);
		expect(result[1].usdBalance).toBe(anotherToken.usdBalance);
		expect(result[2].usdBalance).toBe(thirdToken.usdBalance);

		expect(result[0].tokens[0]).toBe(token);
		expect(result[1].tokens[0]).toBe(anotherToken);
		expect(result[2].tokens[0]).toBe(thirdToken);
	});

	it('should group tokens with the same "main token" and same decimals', () => {
		const tokens = [token, twinToken1, anotherToken, twinToken2];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).toBe(3);
		expect(result[1].tokens.length).toBe(1);

		expect(result[0].id).toBe(token.id);
		expect(result[1].id).toBe(anotherToken.id);

		expect(result[0].nativeToken).toBe(token);
		expect(result[1].nativeToken).toBe(anotherToken);

		expect(result[0].balance).toStrictEqual(
			token.balance.add(twinToken1.balance).add(twinToken2.balance)
		);
		expect(result[1].balance).toBe(anotherToken.balance);

		expect(result[0].usdBalance).toBe(
			token.usdBalance + twinToken1.usdBalance + twinToken2.usdBalance
		);
		expect(result[1].usdBalance).toBe(anotherToken.usdBalance);

		expect(result[0].tokens[0]).toBe(token);
		expect(result[0].tokens[1]).toBe(twinToken1);
		expect(result[0].tokens[2]).toBe(twinToken2);
	});

	it('should group tokens with the same "main token" but not the ones with different decimals', () => {
		const mockTwinToken = {
			...twinToken2,
			decimals: twinToken2.decimals + 1
		};

		const tokens = [token, twinToken1, anotherToken, mockTwinToken];

		const result = groupTokens(tokens);

		expect(result.length).toBe(3);

		expect(result[0].tokens.length).toBe(2);
		expect(result[1].tokens.length).toBe(1);
		expect(result[2].tokens.length).toBe(1);

		expect(result[0].id).toBe(token.id);
		expect(result[1].id).toBe(anotherToken.id);
		expect(result[2].id).toBe(mockTwinToken.id);

		expect(result[0].nativeToken).toBe(token);
		expect(result[1].nativeToken).toBe(anotherToken);
		expect(result[2].nativeToken).toBe(mockTwinToken);

		expect(result[0].balance).toStrictEqual(token.balance.add(twinToken1.balance));
		expect(result[1].balance).toBe(anotherToken.balance);
		expect(result[2].balance).toBe(mockTwinToken.balance);

		expect(result[0].usdBalance).toBe(token.usdBalance + twinToken1.usdBalance);
		expect(result[1].usdBalance).toBe(anotherToken.usdBalance);
		expect(result[2].usdBalance).toBe(mockTwinToken.usdBalance);

		expect(result[0].tokens[0]).toBe(token);
		expect(result[0].tokens[1]).toBe(twinToken1);
	});

	it('should group tokens with the same "main token" respecting the order they arrive in', () => {
		const tokens = [twinToken1, anotherToken, token, twinToken2];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).toBe(3);
		expect(result[1].tokens.length).toBe(1);

		expect(result[0].id).toBe(token.id);
		expect(result[1].id).toBe(anotherToken.id);

		expect(result[0].nativeToken).toBe(token);
		expect(result[1].nativeToken).toBe(anotherToken);

		expect(result[0].balance).toStrictEqual(
			twinToken1.balance.add(token.balance).add(twinToken2.balance)
		);
		expect(result[1].balance).toBe(anotherToken.balance);

		expect(result[0].usdBalance).toBe(
			twinToken1.usdBalance + token.usdBalance + twinToken2.usdBalance
		);
		expect(result[1].usdBalance).toBe(anotherToken.usdBalance);

		expect(result[0].tokens[0]).toBe(twinToken1);
		expect(result[0].tokens[1]).toBe(token);
		expect(result[0].tokens[2]).toBe(twinToken2);
	});

	it('should should create single-element group for the token with no "main token" in the list', () => {
		const tokens = [twinToken1, anotherToken];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		result.map((group) => {
			expect(group.tokens.length).toBe(1);
		});

		expect(result[0].id).toBe(twinToken1.id);
		expect(result[1].id).toBe(anotherToken.id);

		expect(result[0].nativeToken).toBe(twinToken1);
		expect(result[1].nativeToken).toBe(anotherToken);

		expect(result[0].balance).toBe(twinToken1.balance);
		expect(result[1].balance).toBe(anotherToken.balance);

		expect(result[0].usdBalance).toBe(twinToken1.usdBalance);
		expect(result[1].usdBalance).toBe(anotherToken.usdBalance);

		expect(result[0].tokens[0]).toBe(twinToken1);
		expect(result[1].tokens[0]).toBe(anotherToken);
	});

	it('should not re-sort the groups even if the total balance of a group would put it in a higher position in the list', () => {
		// We mock the tokens to have the same "main token"
		const tokens = [anotherToken, token, twinToken1, twinToken2];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).not.toBe(3);

		expect(result[0].id).not.toBe(token.id);

		expect(result[0].nativeToken).not.toBe(token);

		expect(result[0].balance).not.toStrictEqual(
			token.balance.add(twinToken1.balance).add(twinToken2.balance)
		);
	});

	it('should group with balance undefined if any of the tokens has balance undefined', () => {
		const mockTwinToken = {
			...twinToken1,
			balance: undefined,
			usdBalance: undefined
		};

		const tokens = [token, mockTwinToken, twinToken2];

		const result = groupTokens(tokens);

		expect(result.length).toBe(1);

		expect(result[0].tokens.length).toBe(3);

		expect(result[0].id).toBe(token.id);

		expect(result[0].nativeToken).toBe(token);

		expect(result[0].balance).toBeUndefined();

		expect(result[0].usdBalance).toBe(token.usdBalance + twinToken2.usdBalance);
	});
});

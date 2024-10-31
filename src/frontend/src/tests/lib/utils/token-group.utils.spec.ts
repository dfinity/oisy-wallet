import { ICP_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup } from '$lib/types/token-group';
import { groupTokens, groupTokensByTwin } from '$lib/utils/token-group.utils';
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

describe('groupTokens', () => {
	it('should return an empty array if no tokens are provided', () => {
		expect(groupTokens([]).length).toBe(0);
	});

	it('should create groups of single-element tokens if none of them have a "main token"', () => {
		const tokens = [
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{ ...SEPOLIA_TOKEN, balance: bn2, usdBalance: 200 },
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 }
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(3);

		result.map((group) => {
			expect(group.tokens.length).toBe(1);
		});

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(SEPOLIA_TOKEN.id);
		expect(result[2].id).toBe(BTC_TESTNET_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[1]);
		expect(result[2].nativeToken).toBe(tokens[2]);

		expect(result[0].balance).toBe(bn1);
		expect(result[1].balance).toBe(bn2);
		expect(result[2].balance).toBe(bn3);

		expect(result[0].usdBalance).toBe(100);
		expect(result[1].usdBalance).toBe(200);
		expect(result[2].usdBalance).toBe(300);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[1].tokens[0]).toBe(tokens[1]);
		expect(result[2].tokens[0]).toBe(tokens[2]);
	});

	it('should group tokens with the same "main token" and same decimals', () => {
		// We mock the tokens to have the same "main token"
		const tokens = [
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).toBe(3);
		expect(result[1].tokens.length).toBe(1);

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(BTC_TESTNET_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[2]);

		expect(result[0].balance).toStrictEqual(bn1.add(bn2).add(bn1));
		expect(result[1].balance).toBe(bn3);

		expect(result[0].usdBalance).toBe(100 + 200 + 400);
		expect(result[1].usdBalance).toBe(300);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[0].tokens[1]).toBe(tokens[1]);
		expect(result[0].tokens[2]).toBe(tokens[3]);
	});

	it('should group tokens with the same "main token" but not the ones with different decimals', () => {
		// We mock the tokens to have the same "main token"
		const tokens = [
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals + 1
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(3);

		expect(result[0].tokens.length).toBe(2);
		expect(result[1].tokens.length).toBe(1);
		expect(result[2].tokens.length).toBe(1);

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(BTC_TESTNET_TOKEN.id);
		expect(result[2].id).toBe(BTC_REGTEST_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[2]);
		expect(result[2].nativeToken).toBe(tokens[3]);

		expect(result[0].balance).toStrictEqual(bn1.add(bn2));
		expect(result[1].balance).toBe(bn3);
		expect(result[2].balance).toBe(bn1);

		expect(result[0].usdBalance).toBe(100 + 200);
		expect(result[1].usdBalance).toBe(300);
		expect(result[2].usdBalance).toBe(400);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[0].tokens[1]).toBe(tokens[1]);
	});

	it('should group tokens with the same "main token" respecting the order they arrive in', () => {
		// We mock the tokens to have the same "main token"
		const tokens = [
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).toBe(3);
		expect(result[1].tokens.length).toBe(1);

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(BTC_TESTNET_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[2]);
		expect(result[1].nativeToken).toBe(tokens[1]);

		expect(result[0].balance).toStrictEqual(bn2.add(bn1).add(bn1));
		expect(result[1].balance).toBe(bn3);

		expect(result[0].usdBalance).toBe(100 + 200 + 400);
		expect(result[1].usdBalance).toBe(300);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[0].tokens[1]).toBe(tokens[2]);
		expect(result[0].tokens[2]).toBe(tokens[3]);
	});

	it('should should create single-element group for the token with no "main token" in the list', () => {
		// We mock the tokens to have the same "main token"
		const tokens = [
			{
				...ICP_TOKEN,
				balance: bn1,
				usdBalance: 100,
				twinToken: BTC_MAINNET_TOKEN,
				decimals: BTC_MAINNET_TOKEN.decimals
			},
			{ ...SEPOLIA_TOKEN, balance: bn2, usdBalance: 200 }
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		result.map((group) => {
			expect(group.tokens.length).toBe(1);
		});

		expect(result[0].id).toBe(ICP_TOKEN.id);
		expect(result[1].id).toBe(SEPOLIA_TOKEN.id);

		expect(result[0].nativeToken).toBe(tokens[0]);
		expect(result[1].nativeToken).toBe(tokens[1]);

		expect(result[0].balance).toBe(bn1);
		expect(result[1].balance).toBe(bn2);

		expect(result[0].usdBalance).toBe(100);
		expect(result[1].usdBalance).toBe(200);

		expect(result[0].tokens[0]).toBe(tokens[0]);
		expect(result[1].tokens[0]).toBe(tokens[1]);
	});

	it('should not re-sort the groups even if the total balance of a group would put it in a higher position in the list', () => {
		// We mock the tokens to have the same "main token"
		const tokens = [
			{ ...BTC_TESTNET_TOKEN, balance: bn3, usdBalance: 300 },
			{ ...ICP_TOKEN, balance: bn1, usdBalance: 100 },
			{
				...SEPOLIA_TOKEN,
				balance: bn2,
				usdBalance: 200,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			},
			{
				...BTC_REGTEST_TOKEN,
				balance: bn1,
				usdBalance: 400,
				twinToken: ICP_TOKEN,
				decimals: ICP_TOKEN.decimals
			}
		];

		const result = groupTokens(tokens);

		expect(result.length).toBe(2);

		expect(result[0].tokens.length).not.toBe(3);

		expect(result[0].id).not.toBe(ICP_TOKEN.id);

		expect(result[0].nativeToken).not.toBe(tokens[1]);

		expect(result[0].balance).not.toStrictEqual(bn1.add(bn2).add(bn1));
	});
});

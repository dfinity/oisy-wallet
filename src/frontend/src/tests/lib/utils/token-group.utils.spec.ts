import { ICP_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup } from '$lib/types/token-group';
import { groupTokensByTwin } from '$lib/utils/token-group.utils';
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

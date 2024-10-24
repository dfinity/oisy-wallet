import { ETHEREUM_NETWORK, ICP_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { TokenUiGroup } from '$lib/types/token';
import type { CardData } from '$lib/types/token-card';
import { mapHeaderData } from '$lib/utils/token-card.utils';
import { bn1 } from '$tests/mocks/balances.mock';
import { describe, expect, it } from 'vitest';

describe('mapHeaderData', () => {
	// We mock the token group with a mix of data just to verify that the function works correctly
	const tokenGroup: TokenUiGroup = {
		header: {
			name: BTC_MAINNET_TOKEN.name,
			symbol: BTC_MAINNET_TOKEN.symbol,
			decimals: BTC_MAINNET_TOKEN.decimals,
			icon: BTC_MAINNET_TOKEN.icon
		},
		nativeToken: ICP_TOKEN,
		nativeNetwork: ETHEREUM_NETWORK,
		tokens: [ICP_TOKEN, ETHEREUM_TOKEN],
		balance: bn1,
		usdBalance: 300
	};

	it('should correctly map the token group to card data', () => {
		const expected: CardData = {
			name: ICP_TOKEN.name,
			symbol: ICP_TOKEN.symbol,
			decimals: ICP_TOKEN.decimals,
			icon: ICP_TOKEN.icon,
			network: ICP_NETWORK,
			oisyName: { oisyName: BTC_MAINNET_TOKEN.name },
			oisySymbol: { oisySymbol: ICP_TOKEN.name },
			balance: bn1,
			usdBalance: 300
		};

		expect(mapHeaderData(tokenGroup)).toEqual(expected);
	});

	it('should handle edge cases like empty data in token group', () => {
		const { balance: _balance, usdBalance: _usdBalance, ...rest } = tokenGroup;

		const expected: CardData = {
			name: ICP_TOKEN.name,
			symbol: ICP_TOKEN.symbol,
			decimals: ICP_TOKEN.decimals,
			icon: ICP_TOKEN.icon,
			network: ICP_NETWORK,
			oisyName: { oisyName: BTC_MAINNET_TOKEN.name },
			oisySymbol: { oisySymbol: ICP_TOKEN.name }
		};

		expect(mapHeaderData(rest)).toEqual(expected);
	});
});

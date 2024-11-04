import { SEPOLIA_NETWORK } from '$env/networks.env';
import { ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type { CardData } from '$lib/types/token-card';
import type { TokenUiGroup } from '$lib/types/token-group';
import { mapHeaderData } from '$lib/utils/token-card.utils';
import { bn1 } from '$tests/mocks/balances.mock';
import { describe, expect, it } from 'vitest';

describe('mapHeaderData', () => {
	// We mock the token group with a mix of data just to verify that the function works correctly
	const tokenGroup: TokenUiGroup = {
		id: SEPOLIA_TOKEN.id,
		nativeToken: SEPOLIA_TOKEN,
		tokens: [SEPOLIA_TOKEN, ICP_TOKEN],
		balance: bn1,
		usdBalance: 300
	};

	it('should correctly map the token group to card data', () => {
		const expected: CardData = {
			name: SEPOLIA_TOKEN.name,
			symbol: SEPOLIA_TOKEN.symbol,
			decimals: SEPOLIA_TOKEN.decimals,
			icon: SEPOLIA_TOKEN.icon,
			network: SEPOLIA_NETWORK,
			oisyName: { oisyName: `${SEPOLIA_TOKEN.symbol}, ${ICP_TOKEN.symbol}` },
			oisySymbol: { oisySymbol: SEPOLIA_TOKEN.name },
			balance: bn1,
			usdBalance: 300,
			tokenCount: 2
		};

		expect(mapHeaderData(tokenGroup)).toEqual(expected);
	});

	it('should handle edge cases like empty data in token group', () => {
		const { balance: _balance, usdBalance: _usdBalance, ...rest } = tokenGroup;

		const expected: CardData = {
			name: SEPOLIA_TOKEN.name,
			symbol: SEPOLIA_TOKEN.symbol,
			decimals: SEPOLIA_TOKEN.decimals,
			icon: SEPOLIA_TOKEN.icon,
			network: SEPOLIA_NETWORK,
			oisyName: { oisyName: `${SEPOLIA_TOKEN.symbol}, ${ICP_TOKEN.symbol}` },
			oisySymbol: { oisySymbol: SEPOLIA_TOKEN.name },
			tokenCount: 2
		};

		expect(mapHeaderData(rest)).toEqual(expected);
	});
});

import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { CardData } from '$lib/types/token-card';
import type { TokenUiGroup } from '$lib/types/token-group';
import { mapHeaderData } from '$lib/utils/token-card.utils';
import { bn1Bi } from '$tests/mocks/balances.mock';

describe('mapHeaderData', () => {
	const mockGroup = ETH_TOKEN_GROUP;

	const mockToken = SEPOLIA_TOKEN;

	// We mock the token group with a mix of data just to verify that the function works correctly
	const tokenGroup: TokenUiGroup = {
		id: mockGroup.id,
		nativeToken: mockToken,
		groupData: mockGroup,
		tokens: [mockToken, ICP_TOKEN],
		balance: bn1Bi,
		usdBalance: 300
	};

	it('should correctly map the token group to card data', () => {
		const expected: CardData = {
			name: mockToken.name,
			symbol: mockToken.symbol,
			decimals: mockToken.decimals,
			icon: mockToken.icon,
			network: mockToken.network,
			oisyName: { oisyName: `${mockToken.symbol}, ${ICP_TOKEN.symbol}` },
			oisySymbol: { oisySymbol: mockToken.name },
			balance: bn1Bi,
			usdBalance: 300,
			tokenCount: 2
		};

		expect(mapHeaderData(tokenGroup)).toEqual(expected);
	});

	it('should handle edge cases like empty data in token group', () => {
		const { balance: _balance, usdBalance: _usdBalance, ...rest } = tokenGroup;

		const expected: CardData = {
			name: mockToken.name,
			symbol: mockToken.symbol,
			decimals: mockToken.decimals,
			icon: mockToken.icon,
			network: mockToken.network,
			oisyName: { oisyName: `${mockToken.symbol}, ${ICP_TOKEN.symbol}` },
			oisySymbol: { oisySymbol: mockToken.name },
			tokenCount: 2
		};

		expect(mapHeaderData(rest)).toEqual(expected);
	});
});

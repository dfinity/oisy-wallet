import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { Token } from '$lib/types/token';
import type { CardData } from '$lib/types/token-card';
import type { TokenUiGroup } from '$lib/types/token-group';
import { isCardDataTogglableToken, mapHeaderData } from '$lib/utils/token-card.utils';
import { bn1Bi } from '$tests/mocks/balances.mock';

describe('mapHeaderData', () => {
	const mockGroup = ETH_TOKEN_GROUP;

	const mockToken = SEPOLIA_TOKEN;

	// We mock the token group with a mix of data just to verify that the function works correctly
	const tokenGroup: TokenUiGroup = {
		id: mockGroup.id,
		decimals: mockToken.decimals,
		groupData: mockGroup,
		tokens: [mockToken, ICP_TOKEN],
		balance: bn1Bi,
		usdBalance: 300
	};

	it('should correctly map the token group to card data', () => {
		const expected: CardData = {
			name: mockGroup.name,
			symbol: mockGroup.symbol,
			decimals: mockToken.decimals,
			icon: mockGroup.icon,
			oisyName: { oisyName: `${mockToken.symbol}, ${ICP_TOKEN.symbol}` },
			oisySymbol: { oisySymbol: mockGroup.symbol },
			balance: bn1Bi,
			usdBalance: 300,
			tokenCount: 2
		};

		expect(mapHeaderData(tokenGroup)).toEqual(expected);
	});

	it('should handle edge cases like empty data in token group', () => {
		const { balance: _balance, usdBalance: _usdBalance, ...rest } = tokenGroup;

		const expected: CardData = {
			name: mockGroup.name,
			symbol: mockGroup.symbol,
			decimals: mockToken.decimals,
			icon: mockGroup.icon,
			oisyName: { oisyName: `${mockToken.symbol}, ${ICP_TOKEN.symbol}` },
			oisySymbol: { oisySymbol: mockGroup.symbol },
			tokenCount: 2
		};

		expect(mapHeaderData(rest)).toEqual(expected);
	});
});

describe('isCardDataTogglableToken', () => {
	it('should correctly return a valid token', () => {
		const token: IcrcCustomToken = { ...ICP_TOKEN, enabled: false };
		const result = isCardDataTogglableToken(token);

		expect(result).toBeTruthy();
	});

	it('should return undefined if no togglable token is passed', () => {
		const token: Token = ICP_TOKEN;
		const result = isCardDataTogglableToken(token);

		expect(result).toBeFalsy();
	});

	it('should return undefined if no parsable token is passed', () => {
		const token = { ...ICP_TOKEN, standard: undefined, network: null };
		const result = isCardDataTogglableToken(token as unknown as Token);

		expect(result).toBeFalsy();
	});

	it('should return undefined if no valid input', () => {
		const result1 = isCardDataTogglableToken(null as unknown as Token);
		const result2 = isCardDataTogglableToken({} as unknown as Token);
		const result3 = isCardDataTogglableToken(undefined as unknown as Token);

		expect(result1).toBeFalsy();
		expect(result2).toBeFalsy();
		expect(result3).toBeFalsy();
	});
});

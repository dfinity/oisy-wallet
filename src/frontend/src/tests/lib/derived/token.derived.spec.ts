import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { tokenToggleable } from '$lib/derived/token.derived';
import { token } from '$lib/stores/token.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { get } from 'svelte/store';

describe('token.derived', () => {
	const mockEr20UserToken: Erc20UserToken = {
		...mockValidErc20Token,
		id: parseTokenId('Erc20UserTokenId'),
		symbol: 'EUTK',
		address: `${mockValidErc20Token.address}2`,
		version: undefined,
		enabled: true
	};

	const mockIcrcCustomToken: IcrcCustomToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}2`,
		version: 1n,
		enabled: true
	};

	beforeEach(() => {
		token.reset();
	});

	describe('tokenToggleable', () => {
		it('should return false for nullish token', () => {
			expect(get(tokenToggleable)).toBeFalsy();
		});

		it('should return true if default erc20 user token is toggleable', () => {
			token.set(mockEr20UserToken);

			expect(get(tokenToggleable)).toBeTruthy();
		});

		it('should return true if custom erc20 user token is toggleable', () => {
			token.set({ ...mockEr20UserToken, category: 'custom' });

			expect(get(tokenToggleable)).toBeTruthy();
		});

		it('should return false if default ethereum user token is toggleable', () => {
			token.set({ ...mockEr20UserToken, standard: 'ethereum' });

			expect(get(tokenToggleable)).toBeFalsy();
		});

		it('should return true if custom ethereum user token is toggleable', () => {
			token.set({ ...mockEr20UserToken, category: 'custom', standard: 'ethereum' });

			expect(get(tokenToggleable)).toBeTruthy();
		});

		it('should return false if icrc default token is toggleable', () => {
			token.set(mockIcrcCustomToken);

			expect(get(tokenToggleable)).toBeFalsy();
		});

		it('should return true if icrc custom token is toggleable', () => {
			token.set({ ...mockIcrcCustomToken, category: 'custom' });

			expect(get(tokenToggleable)).toBeTruthy();
		});

		it('should return false if btc token is toggleable', () => {
			token.set(BTC_MAINNET_TOKEN);

			expect(get(tokenToggleable)).toBeFalsy();
		});

		it('should return false if sepolia token is toggleable', () => {
			token.set(SEPOLIA_TOKEN);

			expect(get(tokenToggleable)).toBeFalsy();
		});
	});
});

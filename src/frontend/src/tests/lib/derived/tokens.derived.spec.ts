import * as btcEnv from '$env/networks.btc.env';
import * as ethEnv from '$env/networks.eth.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as appContants from '$lib/constants/app.constants';
import { tokens } from '$lib/derived/tokens.derived';
import { testnetsStore } from '$lib/stores/settings.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { get } from 'svelte/store';
import { expect } from 'vitest';

describe('tokens.derived', () => {
	const mockErc20DefaultToken: Erc20Token = {
		...mockValidErc20Token,
		id: parseTokenId('Erc20DefaultTokenId'),
		symbol: 'DTK',
		address: `${mockValidErc20Token.address}1`
	};

	const mockEr20UserToken: Erc20UserToken = {
		...mockValidErc20Token,
		id: parseTokenId('Erc20UserTokenId'),
		symbol: 'EUTK',
		address: `${mockValidErc20Token.address}2`,
		version: undefined,
		enabled: true
	};

	const mockIcrcDefaultToken: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}1`
	};

	const mockIcrcCustomToken: IcrcCustomToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}2`,
		version: 1n,
		enabled: true
	};

	describe('tokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();

			testnetsStore.reset({ key: 'testnets' });

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);
		});

		it('should return all the non-testnet tokens by default', () => {
			erc20DefaultTokensStore.add(mockErc20DefaultToken);
			erc20UserTokensStore.setAll([{ data: mockEr20UserToken, certified: false }]);
			icrcDefaultTokensStore.set({ data: mockIcrcDefaultToken, certified: false });
			icrcCustomTokensStore.set({ data: mockIcrcCustomToken, certified: false });

			const result = get(tokens);

			expect(result).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				{ ...mockErc20DefaultToken, enabled: false, version: undefined },
				mockEr20UserToken,
				{ ...mockIcrcDefaultToken, enabled: false, version: undefined, id: result[5].id },
				{ ...mockIcrcCustomToken, id: result[6].id }
			]);
		});

		it('should return only native tokens when the other token lists are empty', () => {
			expect(get(tokens)).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN]);
		});

		it('should return only ICP when all the token lists are empty (including native tokens)', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => false);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => false);

			expect(get(tokens)).toEqual([ICP_TOKEN]);
		});

		it('should return all the tokens when testnets are enabled', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				ETHEREUM_TOKEN,
				SEPOLIA_TOKEN
			]);
		});
	});
});

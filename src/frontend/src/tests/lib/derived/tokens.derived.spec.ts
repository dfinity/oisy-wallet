import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
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
import { parseTokenId } from '$lib/validation/token.validation';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { splUserTokensStore } from '$sol/stores/spl-user-tokens.store';
import type { SplToken } from '$sol/types/spl';
import type { SplUserToken } from '$sol/types/spl-user-token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { get } from 'svelte/store';

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

	const mockSplDefaultToken: SplToken = {
		...mockValidSplToken,
		id: parseTokenId('SplDefaultTokenId1'),
		symbol: 'SplDefaultTokenId1'
	};

	const mockSplUserToken: SplUserToken = {
		...mockValidSplToken,
		id: parseTokenId('SplUserTokenId2'),
		symbol: 'SplUserTokenId2',
		address: `${mockValidSplToken.address}2`,
		version: undefined,
		enabled: true
	};

	describe('tokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();
			splDefaultTokensStore.reset();
			splUserTokensStore.resetAll();

			setupTestnetsStore('reset');

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);
		});

		it('should return all the non-testnet tokens by default', () => {
			erc20DefaultTokensStore.add(mockErc20DefaultToken);
			erc20UserTokensStore.setAll([{ data: mockEr20UserToken, certified: false }]);
			icrcDefaultTokensStore.set({ data: mockIcrcDefaultToken, certified: false });
			icrcCustomTokensStore.set({ data: mockIcrcCustomToken, certified: false });
			splDefaultTokensStore.add(mockSplDefaultToken);
			splUserTokensStore.setAll([{ data: mockSplUserToken, certified: false }]);

			const result = get(tokens);

			expect(result).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN,
				{ ...mockErc20DefaultToken, enabled: false, version: undefined },
				mockEr20UserToken,
				{ ...mockIcrcDefaultToken, enabled: false, version: undefined, id: result[6].id },
				{ ...mockIcrcCustomToken, id: result[7].id },
				{ ...mockSplDefaultToken, enabled: false, version: undefined },
				mockSplUserToken
			]);
		});

		it('should return only native tokens when the other token lists are empty', () => {
			expect(get(tokens)).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, SOLANA_TOKEN]);
		});

		it('should return only ICP and SOL when all the token lists are empty (including native tokens)', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => false);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => false);

			expect(get(tokens)).toEqual([ICP_TOKEN, SOLANA_TOKEN]);
		});

		it('should return testnet tokens too when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				ETHEREUM_TOKEN,
				SEPOLIA_TOKEN,
				SOLANA_TOKEN,
				SOLANA_TESTNET_TOKEN,
				SOLANA_DEVNET_TOKEN
			]);
		});

		it('should return local tokens too when testnets are enabled and env is LOCAL', () => {
			setupTestnetsStore('enabled');
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				BTC_REGTEST_TOKEN,
				ETHEREUM_TOKEN,
				SEPOLIA_TOKEN,
				SOLANA_TOKEN,
				SOLANA_TESTNET_TOKEN,
				SOLANA_DEVNET_TOKEN,
				SOLANA_LOCAL_TOKEN
			]);
		});
	});
});

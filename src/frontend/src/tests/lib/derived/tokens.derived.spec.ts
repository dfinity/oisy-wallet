import * as bscEnv from '$env/networks/networks-evm/networks.evm.bsc.env';
import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN,
	BNB_TESTNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import {
	POL_AMOY_TOKEN,
	POL_MAINNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';

import {
	ARBITRUM_ETH_TOKEN,
	ARBITRUM_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { ExtCustomToken } from '$icp/types/ext-custom-token';
import type { IcToken } from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as appConstants from '$lib/constants/app.constants';
import {
	enabledNonFungibleTokensBySectionHidden,
	enabledNonFungibleTokensBySectionSpam,
	enabledNonFungibleTokensWithoutSection,
	enabledNonFungibleTokensWithoutSpam,
	enabledUniqueTokensSymbols,
	fungibleTokens,
	tokens
} from '$lib/derived/tokens.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { parseTokenId } from '$lib/validation/token.validation';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplToken } from '$sol/types/spl';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSplCustomToken, mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
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

	const mockErc721CustomToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721DefaultTokenId'),
		symbol: 'DQH',
		address: `${mockValidErc721Token.address}1`,
		version: undefined,
		enabled: true
	};

	const mockErc1155CustomToken: Erc1155CustomToken = {
		...mockValidErc1155Token,
		id: parseTokenId('Erc1155DefaultTokenId'),
		symbol: 'GNT',
		address: `${mockValidErc1155Token.address}1`,
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

	const mockExtCustomToken: ExtCustomToken = {
		...mockValidExtV2Token,
		version: 7n,
		enabled: true
	};

	const mockSplDefaultToken: SplToken = {
		...mockValidSplToken,
		id: parseTokenId('SplDefaultTokenId1'),
		symbol: 'SplDefaultTokenId1'
	};

	const erc721EnabledNoSection = {
		...mockErc721CustomToken,
		enabled: true,
		section: undefined
	};

	const erc721DisabledNoSection = {
		...mockErc721CustomToken,
		enabled: false,
		section: undefined
	};

	const erc1155EnabledNoSection = {
		...mockErc1155CustomToken,
		enabled: true,
		section: undefined
	};

	const erc1155DisabledNoSection = {
		...mockErc1155CustomToken,
		enabled: false,
		section: undefined
	};

	const erc721EnabledSpam = {
		...mockErc721CustomToken,
		enabled: true,
		section: CustomTokenSection.SPAM
	};

	const erc721DisabledSpam = {
		...mockErc721CustomToken,
		enabled: false,
		section: CustomTokenSection.SPAM
	};

	const erc1155EnabledHidden = {
		...mockErc1155CustomToken,
		enabled: true,
		section: CustomTokenSection.HIDDEN
	};

	const erc1155DisabledHidden = {
		...mockErc1155CustomToken,
		enabled: false,
		section: CustomTokenSection.HIDDEN
	};

	const mockErc721CustomTokens = [
		erc721EnabledNoSection,
		erc721DisabledNoSection,
		erc721EnabledSpam,
		erc721DisabledSpam
	].map((token) => ({ data: token, certified: false }));

	const mockErc1155CustomTokens = [
		erc1155EnabledNoSection,
		erc1155DisabledNoSection,
		erc1155EnabledHidden,
		erc1155DisabledHidden
	].map((token) => ({ data: token, certified: false }));

	beforeEach(() => {
		vi.resetAllMocks();

		erc20DefaultTokensStore.reset();
		erc20UserTokensStore.resetAll();
		erc721CustomTokensStore.resetAll();
		erc1155CustomTokensStore.resetAll();
		icrcDefaultTokensStore.resetAll();
		icrcCustomTokensStore.resetAll();
		extCustomTokensStore.resetAll();
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();

		setupTestnetsStore('reset');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);
	});

	describe('tokens', () => {
		it('should return all the non-testnet tokens by default', () => {
			erc20DefaultTokensStore.add(mockErc20DefaultToken);
			erc20UserTokensStore.setAll([{ data: mockEr20UserToken, certified: false }]);
			erc721CustomTokensStore.setAll([{ data: mockErc721CustomToken, certified: false }]);
			erc1155CustomTokensStore.setAll([{ data: mockErc1155CustomToken, certified: false }]);
			icrcDefaultTokensStore.set({ data: mockIcrcDefaultToken, certified: false });
			icrcCustomTokensStore.setAll([{ data: mockIcrcCustomToken, certified: false }]);
			extCustomTokensStore.setAll([{ data: mockExtCustomToken, certified: false }]);
			splDefaultTokensStore.add(mockSplDefaultToken);
			splCustomTokensStore.setAll([{ data: mockSplCustomToken, certified: false }]);

			const result = get(tokens);

			expect(result).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN,
				BASE_ETH_TOKEN,
				BNB_MAINNET_TOKEN,
				POL_MAINNET_TOKEN,
				ARBITRUM_ETH_TOKEN,
				{ ...mockErc20DefaultToken, enabled: false, version: undefined },
				mockEr20UserToken,
				{ ...mockErc721CustomToken, id: result[10].id },
				{ ...mockErc1155CustomToken, id: result[11].id },
				{ ...mockIcrcDefaultToken, enabled: false, version: undefined, id: result[12].id },
				{ ...mockIcrcCustomToken, id: result[13].id },
				{ ...mockExtCustomToken, id: result[14].id },
				{ ...mockSplDefaultToken, enabled: false, version: undefined },
				mockSplCustomToken
			]);
		});

		it('should return only native tokens when the other token lists are empty', () => {
			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN,
				BASE_ETH_TOKEN,
				BNB_MAINNET_TOKEN,
				POL_MAINNET_TOKEN,
				ARBITRUM_ETH_TOKEN
			]);
		});

		it('should return only ICP and SOL when all the token lists are empty (including native tokens)', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => false);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => false);
			vi.spyOn(bscEnv, 'BSC_MAINNET_ENABLED', 'get').mockImplementation(() => false);

			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				SOLANA_TOKEN,
				BASE_ETH_TOKEN,
				POL_MAINNET_TOKEN,
				ARBITRUM_ETH_TOKEN
			]);
		});

		it('should return testnet tokens too when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				TESTICP_TOKEN,
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				ETHEREUM_TOKEN,
				SEPOLIA_TOKEN,
				SOLANA_TOKEN,
				SOLANA_DEVNET_TOKEN,
				BASE_ETH_TOKEN,
				BASE_SEPOLIA_ETH_TOKEN,
				BNB_MAINNET_TOKEN,
				BNB_TESTNET_TOKEN,
				POL_MAINNET_TOKEN,
				POL_AMOY_TOKEN,
				ARBITRUM_ETH_TOKEN,
				ARBITRUM_SEPOLIA_ETH_TOKEN
			]);
		});

		it('should return local tokens too when testnets are enabled and env is LOCAL', () => {
			setupTestnetsStore('enabled');
			vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);

			expect(get(tokens)).toEqual([
				ICP_TOKEN,
				TESTICP_TOKEN,
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				BTC_REGTEST_TOKEN,
				ETHEREUM_TOKEN,
				SEPOLIA_TOKEN,
				SOLANA_TOKEN,
				SOLANA_DEVNET_TOKEN,
				SOLANA_LOCAL_TOKEN,
				BASE_ETH_TOKEN,
				BASE_SEPOLIA_ETH_TOKEN,
				BNB_MAINNET_TOKEN,
				BNB_TESTNET_TOKEN,
				POL_MAINNET_TOKEN,
				POL_AMOY_TOKEN,
				ARBITRUM_ETH_TOKEN,
				ARBITRUM_SEPOLIA_ETH_TOKEN
			]);
		});
	});

	describe('fungibleTokens', () => {
		it('should return all fungible tokens', () => {
			erc20DefaultTokensStore.add(mockErc20DefaultToken);
			erc20UserTokensStore.setAll([{ data: mockEr20UserToken, certified: false }]);
			erc721CustomTokensStore.setAll([{ data: mockErc721CustomToken, certified: false }]);
			erc1155CustomTokensStore.setAll([{ data: mockErc1155CustomToken, certified: false }]);
			icrcDefaultTokensStore.set({ data: mockIcrcDefaultToken, certified: false });
			icrcCustomTokensStore.setAll([{ data: mockIcrcCustomToken, certified: false }]);
			extCustomTokensStore.setAll([{ data: mockExtCustomToken, certified: false }]);
			splDefaultTokensStore.add(mockSplDefaultToken);
			splCustomTokensStore.setAll([{ data: mockSplCustomToken, certified: false }]);

			const result = get(fungibleTokens);

			expect(result).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN,
				BASE_ETH_TOKEN,
				BNB_MAINNET_TOKEN,
				POL_MAINNET_TOKEN,
				ARBITRUM_ETH_TOKEN,
				{ ...mockErc20DefaultToken, enabled: false, version: undefined },
				mockEr20UserToken,
				{ ...mockIcrcDefaultToken, enabled: false, version: undefined, id: result[10].id },
				{ ...mockIcrcCustomToken, id: result[11].id },
				{ ...mockExtCustomToken, id: result[12].id },
				{ ...mockSplDefaultToken, enabled: false, version: undefined },
				mockSplCustomToken
			]);
		});
	});

	describe('enabledUniqueTokensSymbols', () => {
		it('should return all unique enabled tokens symbols', () => {
			const result = get(enabledUniqueTokensSymbols);

			expect(result).toEqual([
				ICP_TOKEN.symbol,
				BTC_MAINNET_TOKEN.symbol,
				ETHEREUM_TOKEN.symbol,
				SOLANA_TOKEN.symbol,
				BNB_MAINNET_TOKEN.symbol,
				POL_MAINNET_TOKEN.symbol
			]);
		});
	});

	describe('enabledNonFungibleTokensWithoutSection', () => {
		beforeEach(() => {
			erc721CustomTokensStore.setAll(mockErc721CustomTokens);
			erc1155CustomTokensStore.setAll(mockErc1155CustomTokens);
		});

		it('should return all enabled non-fungible tokens without section', () => {
			expect(get(enabledNonFungibleTokensWithoutSection)).toStrictEqual([
				erc721EnabledNoSection,
				erc1155EnabledNoSection
			]);
		});

		it('should fallback to an empty list', () => {
			erc721CustomTokensStore.resetAll();
			erc1155CustomTokensStore.resetAll();

			expect(get(enabledNonFungibleTokensWithoutSection)).toStrictEqual([]);
		});
	});

	describe('enabledNonFungibleTokensBySectionHidden', () => {
		beforeEach(() => {
			erc721CustomTokensStore.setAll(mockErc721CustomTokens);
			erc1155CustomTokensStore.setAll(mockErc1155CustomTokens);
		});

		it('should return all enabled non-fungible tokens marked as hidden', () => {
			expect(get(enabledNonFungibleTokensBySectionHidden)).toStrictEqual([erc1155EnabledHidden]);
		});

		it('should fallback to an empty list', () => {
			erc721CustomTokensStore.resetAll();
			erc1155CustomTokensStore.resetAll();

			expect(get(enabledNonFungibleTokensBySectionHidden)).toStrictEqual([]);
		});
	});

	describe('enabledNonFungibleTokensBySectionSpam', () => {
		beforeEach(() => {
			erc721CustomTokensStore.setAll(mockErc721CustomTokens);
			erc1155CustomTokensStore.setAll(mockErc1155CustomTokens);
		});

		it('should return all enabled non-fungible tokens marked as spam', () => {
			expect(get(enabledNonFungibleTokensBySectionSpam)).toStrictEqual([erc721EnabledSpam]);
		});

		it('should fallback to an empty list', () => {
			erc721CustomTokensStore.resetAll();
			erc1155CustomTokensStore.resetAll();

			expect(get(enabledNonFungibleTokensBySectionSpam)).toStrictEqual([]);
		});
	});

	describe('enabledNonFungibleTokensWithoutSpam', () => {
		beforeEach(() => {
			erc721CustomTokensStore.setAll(mockErc721CustomTokens);
			erc1155CustomTokensStore.setAll(mockErc1155CustomTokens);
		});

		it('should return all enabled non-fungible tokens not marked as spam', () => {
			expect(get(enabledNonFungibleTokensWithoutSpam)).toStrictEqual([
				erc721EnabledNoSection,
				erc1155EnabledNoSection,
				erc1155EnabledHidden
			]);
		});

		it('should fallback to an empty list', () => {
			erc721CustomTokensStore.resetAll();
			erc1155CustomTokensStore.resetAll();

			expect(get(enabledNonFungibleTokensWithoutSpam)).toStrictEqual([]);
		});
	});
});

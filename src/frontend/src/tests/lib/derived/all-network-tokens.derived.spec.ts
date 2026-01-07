import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import * as solEnv from '$env/networks/networks.sol.env';
import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { POL_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as tokensIcEnv from '$env/tokens/tokens.ic.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { erc721Tokens } from '$eth/derived/erc721.derived';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { allFungibleNetworkTokens } from '$lib/derived/all-network-tokens.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { splTokens } from '$sol/derived/spl.derived';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('all-network-tokens.derived', () => {
	const mockIcrcToken: IcrcCustomToken = {
		...mockValidIcToken,
		enabled: true
	};

	const mockIcrcToken2: IcrcCustomToken = {
		...mockValidIcCkToken,
		id: parseTokenId('STK'),
		ledgerCanisterId: 'mock-ledger-canister-id',
		name: 'other-dummy-token',
		enabled: true
	};

	const mockDip20Token: IcrcCustomToken = {
		...mockValidIcCkToken,
		standard: { code: 'dip20' },
		id: parseTokenId('XTC'),
		symbol: 'XTC',
		ledgerCanisterId: 'mock-ledger-canister-id',
		name: 'dummy-dip20-token',
		enabled: true
	};

	const mockErc20Token: Erc20CustomToken = {
		...mockValidErc20Token,
		id: parseTokenId('DUM'),
		address: mockEthAddress,
		exchange: 'erc20',
		enabled: false
	};

	const mockErc721Token: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('KUM'),
		address: mockEthAddress,
		enabled: false
	};

	const mockSplToken: SplCustomToken = {
		...mockValidSplToken,
		enabled: true
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mockPage.reset();

		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(solEnv, 'SOL_MAINNET_ENABLED', 'get').mockImplementation(() => true);

		setupTestnetsStore('reset');
		setupUserNetworksStore('allEnabled');

		erc721CustomTokensStore.resetAll();
		erc20DefaultTokensStore.reset();
		erc20UserTokensStore.resetAll();
		icrcDefaultTokensStore.resetAll();
		icrcCustomTokensStore.resetAll();
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();

		vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
			fn([mockErc20Token]);
			return () => {};
		});

		vi.spyOn(erc721Tokens, 'subscribe').mockImplementation((fn) => {
			fn([mockErc721Token]);
			return () => {};
		});

		vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockIcrcToken]);
			return () => {};
		});

		vi.spyOn(splTokens, 'subscribe').mockImplementation((fn) => {
			fn([mockSplToken]);
			return () => {};
		});

		vi.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get').mockImplementation(() => [
			mockIcrcToken2,
			mockDip20Token
		]);
	});

	describe('allFungibleNetworkTokens', () => {
		it('should return all non-testnet fungible tokens when no network is selected and testnets are disabled', () => {
			const tokens = get(allFungibleNetworkTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toStrictEqual([
				ICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				BASE_ETH_TOKEN.id.description,
				BNB_MAINNET_TOKEN.id.description,
				POL_MAINNET_TOKEN.id.description,
				ARBITRUM_ETH_TOKEN.id.description,
				mockErc20Token.id.description,
				mockDip20Token.id.description,
				mockIcrcToken2.id.description,
				mockIcrcToken.id.description,
				mockSplToken.id.description
			]);
		});

		it('should return all fungible tokens for the selected network', () => {
			mockPage.mock({ network: ETHEREUM_NETWORK_ID.description });

			const tokens = get(allFungibleNetworkTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toStrictEqual([
				ETHEREUM_TOKEN.id.description,
				mockErc20Token.id.description
			]);
		});
	});
});

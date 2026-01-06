import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import * as appConstants from '$lib/constants/app.constants';
import {
	enabledFungibleTokensUi,
	enabledMainnetFungibleIcTokensUsdBalance,
	enabledMainnetFungibleTokensUi,
	enabledMainnetFungibleTokensUsdBalance
} from '$lib/derived/tokens-ui.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { isTokenNonFungible } from '$lib/utils/nft.utils';
import { mapTokenUi } from '$lib/utils/token.utils';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('tokens-ui.derived', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		erc20DefaultTokensStore.reset();
		erc20UserTokensStore.resetAll();
		erc721CustomTokensStore.resetAll();
		erc1155CustomTokensStore.resetAll();
		icrcDefaultTokensStore.resetAll();
		icrcCustomTokensStore.resetAll();
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();

		setupTestnetsStore('reset');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);
	});

	describe('enabledFungibleTokensUi', () => {
		it('returns correct data', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledFungibleTokensUi)).toStrictEqual(
				get(tokens).map((token) =>
					mapTokenUi({ token, $balances: {}, $stakeBalances: {}, $exchanges: {} })
				)
			);
		});

		it('should not include NFTs', () => {
			expect(get(enabledFungibleTokensUi).every(isTokenNonFungible)).toBeFalsy();
		});
	});

	describe('enabledMainnetFungibleTokensUi', () => {
		it('returns correct data', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledMainnetFungibleTokensUi)).toStrictEqual(
				get(tokens)
					.filter(({ network: { env } }) => env !== 'testnet')
					.map((token) => mapTokenUi({ token, $balances: {}, $stakeBalances: {}, $exchanges: {} }))
			);
		});

		it('should not include NFTs', () => {
			expect(get(enabledMainnetFungibleTokensUi).every(isTokenNonFungible)).toBeFalsy();
		});
	});

	describe('enabledMainnetFungibleTokensUsdBalance', () => {
		it('returns correct data', () => {
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: 500000000000n, certified: true }
			});
			balancesStore.set({
				id: BTC_MAINNET_TOKEN.id,
				data: { data: 200000000000n, certified: true }
			});
			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: 500000000000000n, certified: true }
			});

			exchangeStore.set([
				{ ethereum: { usd: 1 } },
				{ 'internet-computer': { usd: 20 } },
				{ bitcoin: { usd: 5 } }
			]);

			expect(get(enabledMainnetFungibleTokensUsdBalance)).toEqual(110000.0005);
		});
	});

	describe('enabledMainnetFungibleIcTokensUsdBalance', () => {
		it('returns correct data', () => {
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: 500000000000n, certified: true }
			});
			balancesStore.set({
				id: BTC_MAINNET_TOKEN.id,
				data: { data: 200000000000n, certified: true }
			});
			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: 500000000000000n, certified: true }
			});

			exchangeStore.set([
				{ ethereum: { usd: 1 } },
				{ 'internet-computer': { usd: 20 } },
				{ bitcoin: { usd: 5 } }
			]);

			expect(get(enabledMainnetFungibleIcTokensUsdBalance)).toEqual(100000);
		});
	});
});

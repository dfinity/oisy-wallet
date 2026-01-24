import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { enabledKaspaTokens } from '$kaspa/derived/tokens.derived';
import { kaspaTransactionsStore } from '$kaspa/stores/kaspa-transactions.store';
import { LOCAL } from '$lib/constants/app.constants';
import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
import type { TransactionsStoreCheckParams } from '$lib/types/transactions';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { derived, type Readable } from 'svelte/store';

export const transactionsStoreWithTokens: Readable<TransactionsStoreCheckParams[]> = derived(
	[
		btcTransactionsStore,
		ethTransactionsStore,
		icTransactionsStore,
		solTransactionsStore,
		kaspaTransactionsStore,
		enabledBitcoinTokens,
		enabledEthereumTokens,
		enabledErc20Tokens,
		enabledIcTokens,
		enabledSolanaTokens,
		enabledSplTokens,
		enabledKaspaTokens
	],
	([
		$btcTransactionsStore,
		$ethTransactionsStore,
		$icTransactionsStore,
		$solTransactionsStore,
		$kaspaTransactionsStore,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$enabledErc20Tokens,
		$enabledIcTokens,
		$enabledSolanaTokens,
		$enabledSplTokens,
		$enabledKaspaTokens
	]) =>
		// In LOCAL mode, we return an empty array to prevent the Activity page from being
		// stuck on loading skeletons due to unavailable canisters or slow external APIs.
		LOCAL
			? []
			: [
					{ transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens },
					{ transactionsStoreData: $kaspaTransactionsStore, tokens: $enabledKaspaTokens },
					{ transactionsStoreData: $icTransactionsStore, tokens: $enabledIcTokens },
					{
						transactionsStoreData: $ethTransactionsStore,
						tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens]
					},
					{
						transactionsStoreData: $solTransactionsStore,
						tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
					}
				]
);

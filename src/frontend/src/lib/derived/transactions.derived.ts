import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
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
		enabledBitcoinTokens,
		enabledEthereumTokens,
		enabledErc20Tokens,
		enabledIcTokens,
		enabledSolanaTokens,
		enabledSplTokens
	],
	([
		$btcTransactionsStore,
		$ethTransactionsStore,
		$icTransactionsStore,
		$solTransactionsStore,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$enabledErc20Tokens,
		$enabledIcTokens,
		$enabledSolanaTokens,
		$enabledSplTokens
	]) => [
		// We explicitly do not include the Bitcoin transactions store locally, as it may cause lags in the UI.
		// It could take longer time to be initialized and in case of no transactions (for example, a new user), it would be stuck to show the skeletons.
		...(LOCAL
			? []
			: [{ transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens }]),
		{
			transactionsStoreData: $ethTransactionsStore,
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens]
		},
		{ transactionsStoreData: $icTransactionsStore, tokens: $enabledIcTokens },
		{
			transactionsStoreData: $solTransactionsStore,
			tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
		}
	]
);

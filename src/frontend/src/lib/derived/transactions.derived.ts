import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { LOCAL } from '$lib/constants/app.constants';
import {
	enabledErc20Tokens,
	enabledErc4626Tokens,
	enabledIcTokens
} from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TransactionsStoreCheckParams } from '$lib/types/transactions';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
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
		enabledErc4626Tokens,
		enabledIcTokens,
		enabledSolanaTokens,
		enabledSplTokens,
		xrpTransactionsStore,
		enabledXrpTokens,
		balancesStore
	],
	([
		$btcTransactionsStore,
		$ethTransactionsStore,
		$icTransactionsStore,
		$solTransactionsStore,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$enabledErc20Tokens,
		$enabledErc4626Tokens,
		$enabledIcTokens,
		$enabledSolanaTokens,
		$enabledSplTokens,
		$xrpTransactionsStore,
		$enabledXrpTokens,
		$balancesStore
	]) => [
		// We explicitly do not include the Bitcoin transactions store locally, as it may cause lags in the UI.
		// It could take longer time to be initialized and in case of no transactions (for example, a new user), it would be stuck to show the skeletons.
		...(LOCAL
			? []
			: [{ transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens }]),
		{
			transactionsStoreData: $ethTransactionsStore,
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens, ...$enabledErc4626Tokens]
		},
		{
			transactionsStoreData: $icTransactionsStore,
			// An IC token whose first sync failed never gets a history entry: the error path resets the
			// balance and leaves the history alone, so that a later sync can still bring it. Waiting for
			// it held every check on this list, Activity's levelling included, for as long as its ledger
			// was down. The history cannot record the failure itself, because `null` means "no Index
			// canister" for IC tokens, so the reset balance is what tells the two apart.
			tokens: $enabledIcTokens.filter(
				({ id }) => !($balancesStore?.[id] === null && $icTransactionsStore?.[id] === undefined)
			)
		},
		{
			transactionsStoreData: $solTransactionsStore,
			tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
		},
		// Only participate in the loading check once XRP is actually enabled. While it is
		// disabled nothing ever writes the store, so its permanently nullish data would
		// count as "still loading" and keep the activity skeletons up forever.
		...($enabledXrpTokens.length > 0
			? [{ transactionsStoreData: $xrpTransactionsStore, tokens: $enabledXrpTokens }]
			: [])
	]
);

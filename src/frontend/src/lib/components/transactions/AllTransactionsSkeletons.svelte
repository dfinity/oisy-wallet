<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import {
		type EthTransactionsData,
		ethTransactionsStore
	} from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
	import type { CertifiedStoreData } from '$lib/stores/certified.store';
	import type { TransactionsData } from '$lib/stores/transactions.store';
	import type { Token } from '$lib/types/token';
	import {
		isTransactionsStoreEmpty,
		isTransactionsStoreNotEmpty,
		isTransactionsStoreNotInitialized
	} from '$lib/utils/transactions.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	export let testIdPrefix: string | undefined = undefined;

	let transactionsStores: {
		// TODO: set unified type when we harmonize the transaction stores
		transactionsStoreData:
			| CertifiedStoreData<TransactionsData<IcTransactionUi | BtcTransactionUi | SolTransactionUi>>
			| EthTransactionsData;
		tokens: Token[];
	}[];
	$: transactionsStores = [
		{ transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens },
		{
			transactionsStoreData: $ethTransactionsStore,
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens]
		},
		{ transactionsStoreData: $icTransactionsStore, tokens: $enabledIcTokens },
		{
			transactionsStoreData: $solTransactionsStore,
			tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
		}
	];

	let loading = true;
	$: loading =
		(transactionsStores.some(({ transactionsStoreData }) => isNullish(transactionsStoreData)) ||
		transactionsStores.every(({ transactionsStoreData, tokens }) =>
			isTransactionsStoreNotInitialized({ transactionsStoreData, tokens })
		)) && transactionsStores.every(({ transactionsStoreData, tokens }) =>
			isTransactionsStoreEmpty({ transactionsStoreData, tokens })
		) ;
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>

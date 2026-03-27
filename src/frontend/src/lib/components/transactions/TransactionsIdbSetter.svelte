<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import {
		setIdbBtcTransactions,
		setIdbEthTransactions,
		setIdbIcTransactions,
		setIdbSolTransactions
	} from '$lib/api/idb-transactions.api';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	// We separate the reactivity to avoid triggering the effects for independent stores
	// We don't need to track identity and tokens changes for every store, since we are interested in the final result of the transactions' store.
	// And the transactions' store will be updated when the identity or tokens change too.

	const debounceSetIdbBtcTransactions = debounce(() => {
		setIdbBtcTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $btcTransactionsStore
		});
	}, WALLET_TIMER_INTERVAL_MILLIS);

	$effect(() => {
		[$btcTransactionsStore];

		debounceSetIdbBtcTransactions();
	});

	const debounceSetIdbEthTransactions = debounce(() => {
		setIdbEthTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $ethTransactionsStore
		});
	}, WALLET_TIMER_INTERVAL_MILLIS);

	$effect(() => {
		[$ethTransactionsStore];

		debounceSetIdbEthTransactions();
	});

	const debounceSetIdbIcTransactions = debounce(() => {
		setIdbIcTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $icTransactionsStore
		});
	}, WALLET_TIMER_INTERVAL_MILLIS);

	$effect(() => {
		[$icTransactionsStore];

		debounceSetIdbIcTransactions();
	});

	const debounceSetIdbSolTransactions = debounce(() => {
		setIdbSolTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $solTransactionsStore
		});
	}, WALLET_TIMER_INTERVAL_MILLIS);

	$effect(() => {
		[$solTransactionsStore];

		debounceSetIdbSolTransactions();
	});
</script>

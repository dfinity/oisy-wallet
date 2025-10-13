<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import {
		setIdbBtcTransactions,
		setIdbEthTransactions,
		setIdbIcTransactions,
		setIdbSolTransactions
	} from '$lib/api/idb-transactions.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// We separate the reactivity to avoid triggering the effects for independent stores
	// We don't need to track identity and tokens changes for every store, since we are interested in the final result of the transactions' store.
	// And the transactions' store will be updated when the identity or tokens change too.

	const debounceSetIdbBtcTransactions = debounce(() => {
		setIdbBtcTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $btcTransactionsStore
		});
	}, 10_000);

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
	}, 10_000);

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
	}, 10_000);

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
	}, 10_000);

	$effect(() => {
		[$solTransactionsStore];

		debounceSetIdbSolTransactions();
	});
</script>

{@render children?.()}

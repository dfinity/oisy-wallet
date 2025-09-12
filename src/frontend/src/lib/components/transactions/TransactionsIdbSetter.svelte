<script lang="ts">
	import { type Snippet, type Snippet, untrack } from 'svelte';
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
	// We don't need to track identity and tokens changes for every store, since we are interested in the final result of the transactions store.
	// And the transactions store will be updated when the identity or tokens change too.
	// TODO: split it by single token to avoid unnecessary updates. This should happen directly

	$effect(() => {
		setIdbBtcTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $btcTransactionsStore
		});
	});

	$effect(() => {
		setIdbEthTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $ethTransactionsStore
		});
	});

	$effect(() => {
		setIdbIcTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $icTransactionsStore
		});
	});

	$effect(() => {
		setIdbSolTransactions({
			identity: untrack(() => $authIdentity),
			tokens: untrack(() => $enabledTokens),
			transactionsStoreData: $solTransactionsStore
		});
	});
</script>

{@render children?.()}

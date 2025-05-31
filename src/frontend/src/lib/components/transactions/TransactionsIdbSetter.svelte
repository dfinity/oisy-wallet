<script lang="ts">
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

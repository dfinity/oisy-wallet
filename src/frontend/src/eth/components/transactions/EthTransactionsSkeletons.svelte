<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ethTransactionsNotInitialized } from '$eth/derived/eth-transactions.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let loading = $derived($tokenNotInitialized || $ethTransactionsNotInitialized);
</script>

<TransactionsSkeletons {loading}>
	{@render children()}
</TransactionsSkeletons>

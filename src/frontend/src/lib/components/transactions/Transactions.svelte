<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TransactionsSignedIn from '$lib/components/transactions/TransactionsSignedIn.svelte';
	import TransactionsSignedOut from '$lib/components/transactions/TransactionsSignedOut.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken } from '$lib/types/token';

	export let token: OptionToken;
</script>

{#if $authSignedIn && nonNullish(token)}
	<TransactionsSignedIn {token} />
{:else}
	<TransactionsSignedOut />
{/if}

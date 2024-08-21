<script lang="ts">
	import { authSignedIn } from '$lib/derived/auth.derived';
	import TransactionsSignedIn from '$lib/components/transactions/TransactionsSignedIn.svelte';
	import TransactionsSignedOut from '$lib/components/transactions/TransactionsSignedOut.svelte';
</script>

{#if $authSignedIn}
	<TransactionsSignedIn />
{:else}
	<TransactionsSignedOut />
{/if}

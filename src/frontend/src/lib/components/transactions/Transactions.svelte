<script lang="ts">
	import TransactionsSignedIn from '$lib/components/transactions/TransactionsSignedIn.svelte';
	import TransactionsSignedOut from '$lib/components/transactions/TransactionsSignedOut.svelte';
	import SignedOutBlur from '$lib/components/ui/SignedOutBlur.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<TransactionsSignedIn />
{:else}
	<SignedOutBlur>
		<TransactionsSignedOut />
	</SignedOutBlur>
{/if}

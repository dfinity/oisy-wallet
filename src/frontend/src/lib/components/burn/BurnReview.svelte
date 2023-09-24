<script lang="ts">
	import SendReviewActions from '$lib/components/send/SendReviewActions.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { token } from '$lib/derived/token.derived';
	import { invalidIcpAddress } from '$lib/utils/icp.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: (async () => {
		invalid =
			invalidDestination(destination) ||
			invalidAmount(amount) ||
			(await invalidIcpAddress(destination));
	})();
</script>

<SendDestination {destination} {amount} token={$token} />

{#if invalid}
    <p class="font-bold text-cyclamen px-1.25 my-2">Invalid ICP account identifier.</p>
{/if}

<SendReviewActions {invalid} on:icSend on:icBack>Burn</SendReviewActions>
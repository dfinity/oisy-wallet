<script lang="ts">
	import SendReviewActions from '$lib/components/send/SendReviewActions.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { token } from '$lib/derived/token.derived';

	export let destination = '';
	export let amount: number | undefined = undefined;

	// TODO: implement `checkAccountId` from `@dfinity/nns`

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount);
</script>

<SendDestination {destination} {amount} token={$token} />

<SendReviewActions {invalid} on:icSend on:icBack>Burn</SendReviewActions>

<script lang="ts">
	import SendReview from '$lib/components/send/SendReview.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isInvalidDestinationBtc({
			destination,
			networkId
		}) || invalidAmount(amount);
</script>

<SendReview {source} {amount} {destination} disabled={invalid} />

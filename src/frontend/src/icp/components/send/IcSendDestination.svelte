<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean =>
		isInvalidDestinationIc({
			destination,
			tokenStandard: $tokenStandard,
			networkId
		});
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder="Enter account identifier"
/>

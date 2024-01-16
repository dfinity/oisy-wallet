<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { isAddress } from '@ethersproject/address';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let invalidDestination = false;

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean => {
		if (isNullishOrEmpty(destination)) {
			return false;
		}

		return !isAddress(destination);
	};
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder="Enter public address (0x)"
/>

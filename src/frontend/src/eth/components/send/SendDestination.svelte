<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isEthAddress } from '$lib/utils/account.utils';

	export let destination = '';
	export let invalidDestination = false;

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean => {
		if (isNullishOrEmpty(destination)) {
			return false;
		}

		return !isEthAddress(destination);
	};
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder="Enter public address (0x)"
/>

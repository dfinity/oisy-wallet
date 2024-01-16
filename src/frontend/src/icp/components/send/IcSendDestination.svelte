<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { debounce } from '@dfinity/utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

	let isInvalidDestination: () => boolean;

	const init = () =>
		(isInvalidDestination = (): boolean =>
			isInvalidDestinationIc({
				destination,
				tokenStandard: $tokenStandard,
				networkId
			}));

	const debounceValidateInit = debounce(init);

	$: destination, $tokenStandard, networkId, debounceValidateInit();
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder="Enter account identifier"
/>

<script lang="ts">
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { debounce } from '@dfinity/utils';
	import type { NetworkId } from '$lib/types/network';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { isInvalidDestinationIc } from '$icp/utils/send.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

	const validate = () =>
		(invalidDestination = isInvalidDestinationIc({
			destination,
			tokenStandard: $tokenStandard,
			networkId
		}));

	const debounceValidate = debounce(validate);

	$: destination, networkId, debounceValidate();
</script>

<SendDestination bind:destination {invalidDestination} network={ICP_NETWORK} />

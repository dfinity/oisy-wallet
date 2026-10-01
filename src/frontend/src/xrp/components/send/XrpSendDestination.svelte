<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isInvalidDestinationXrp } from '$xrp/utils/xrp-send.utils';

	interface Props {
		destination: string;
		invalidDestination: boolean;
		knownDestinations?: KnownDestinations;
		onQRCodeScan?: () => void;
	}

	let {
		destination = $bindable(''),
		invalidDestination = $bindable(false),
		knownDestinations,
		onQRCodeScan
	}: Props = $props();

	const isInvalidDestination = (): boolean => isInvalidDestinationXrp(destination);
</script>

<SendInputDestination
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	{knownDestinations}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={onQRCodeScan}
	bind:destination
	bind:invalidDestination
/>

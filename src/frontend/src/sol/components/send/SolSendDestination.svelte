<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isInvalidDestinationSol } from '$sol/utils/sol-send.utils';

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

	const isInvalidDestination = (): boolean => isInvalidDestinationSol(destination);
</script>

<SendInputDestination
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	{knownDestinations}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={onQRCodeScan}
	bind:destination
	bind:invalidDestination
/>

<!-- TODO: PRODSEC: add some sort of warning/info when the destination input is not an ATA address, either here or in the confirmation review step -->

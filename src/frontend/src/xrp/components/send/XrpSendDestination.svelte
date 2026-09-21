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

<!-- Address only, unlike the BTC and SOL inputs that share `enter_recipient_address`. Nothing
	resolves a name here: XRP has no contacts yet, and `SendDestinationWizardStep` renders this
	without `knownDestinations`, so the prop below is never filled. Prompting for a name would
	steer the user into an invalid-address error. Switch back to the shared string once either
	source is wired. -->
<SendInputDestination
	inputPlaceholder={$i18n.send.placeholder.enter_xrp_address}
	{knownDestinations}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={onQRCodeScan}
	bind:destination
	bind:invalidDestination
/>

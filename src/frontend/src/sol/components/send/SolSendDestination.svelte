<script lang="ts">
	import { assertNonNullish, debounce, notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { SolanaNetworkType } from '$sol/types/network';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
	import { isAtaAddress } from '$sol/utils/sol-address.utils';
	import { isInvalidDestinationSol } from '$sol/utils/sol-send.utils';

	export let destination = '';
	export let invalidDestination = false;

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean => isInvalidDestinationSol(destination);

	let network: SolanaNetworkType | undefined;
	$: network = mapNetworkIdToNetwork($sendTokenNetworkId);

	let isAtaDestination = true;

	const updateIsAtaDestination = async () => {
		assertNonNullish(network, 'No Solana network provided to start Solana wallet worker.');

		isAtaDestination = await isAtaAddress({ address: destination, network });
	};

	const debounceUpdateIsAtaDestination = debounce(updateIsAtaDestination);

	$: destination, debounceUpdateIsAtaDestination();
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	on:icQRCodeScan
	onQRButtonClick={() => dispatch('icQRCodeScan')}
/>

{#if notEmptyString(destination) && !invalidDestination && !isAtaDestination}
	<p transition:slide={SLIDE_DURATION} class="pb-3 text-warning-primary">
		{$i18n.send.info.ata_will_be_calculated}
	</p>
{/if}

<script lang="ts">
	import { debounce, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import QrButton from '$lib/components/common/QrButton.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { DESTINATION_INPUT } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isDesktop } from '$lib/utils/device.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;
	export let inputPlaceholder: string;
	export let isInvalidDestination: (() => boolean) | undefined;
	export let onQRButtonClick: (() => void) | undefined = undefined;
	export let knownDestinations: KnownDestinations | undefined = undefined;

	const validate = () => (invalidDestination = isInvalidDestination?.() ?? false);

	const debounceValidate = debounce(validate);

	$: destination, networkId, isInvalidDestination, debounceValidate();
</script>

<label for="destination" class="font-bold">
	{$i18n.core.text.to}
</label>

<div class="mb-4">
	<InputTextWithAction
		name="destination"
		bind:value={destination}
		placeholder={inputPlaceholder}
		testId={DESTINATION_INPUT}
		autofocus={isDesktop()}
		on:nnsInput
	>
		<svelte:fragment slot="inner-end">
			{#if nonNullish(onQRButtonClick)}
				<QrButton on:click={onQRButtonClick} />
			{/if}
		</svelte:fragment>
	</InputTextWithAction>
</div>

{#if invalidDestination}
	<p transition:slide={SLIDE_DURATION} class="pb-3 text-error-primary">
		{$i18n.send.assertion.invalid_destination_address}
	</p>
{:else if notEmptyString(destination) && nonNullish(knownDestinations) && isNullish(knownDestinations[destination.toLowerCase()])}
	<div transition:slide={SLIDE_DURATION}>
		<MessageBox level="warning">
			{$i18n.send.info.unknown_destination}
		</MessageBox>
	</div>
{/if}

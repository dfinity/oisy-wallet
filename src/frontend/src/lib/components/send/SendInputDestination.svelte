<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import QRButton from '$lib/components/common/QRButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;
	export let inputPlaceholder: string;
	export let isInvalidDestination: (() => boolean) | undefined;
	export let onQRButtonClick: (() => void) | undefined = undefined;

	const validate = () => (invalidDestination = isInvalidDestination?.() ?? false);

	const debounceValidate = debounce(validate);

	$: destination, networkId, isInvalidDestination, debounceValidate();
</script>

<label for="destination" class="font-bold px-4.5">{$i18n.send.text.destination}:</label>
<Input
	name="destination"
	inputType="text"
	required
	bind:value={destination}
	placeholder={inputPlaceholder}
	spellcheck={false}
	on:nnsInput
>
	<svelte:fragment slot="inner-end">
		{#if nonNullish(onQRButtonClick)}
			<QRButton on:click={onQRButtonClick} />
		{/if}
	</svelte:fragment>
</Input>

{#if invalidDestination}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">
		{$i18n.send.assertion.invalid_destination_address}
	</p>
{/if}

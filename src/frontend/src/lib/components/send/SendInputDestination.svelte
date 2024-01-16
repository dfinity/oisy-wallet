<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import type { NetworkId } from '$lib/types/network';
	import { slide } from 'svelte/transition';
	import { debounce } from '@dfinity/utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;
	export let inputPlaceholder: string;
	export let isInvalidDestination: () => boolean;

	const validate = () => (invalidDestination = isInvalidDestination());

	const debounceValidate = debounce(validate);

	$: destination, networkId, debounceValidate();
</script>

<label for="destination" class="font-bold px-4.5">Destination:</label>
<Input
	name="destination"
	inputType="text"
	required
	bind:value={destination}
	placeholder={inputPlaceholder}
/>

{#if invalidDestination}
	<p transition:slide class="text-cyclamen pb-3">Invalid destination address</p>
{/if}

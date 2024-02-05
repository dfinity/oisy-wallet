<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import type { NetworkId } from '$lib/types/network';
	import { slide } from 'svelte/transition';
	import { debounce } from '@dfinity/utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;
	export let inputPlaceholder: string;
	export let isInvalidDestination: (() => boolean) | undefined;

	const validate = () => (invalidDestination = isInvalidDestination?.() ?? false);

	const debounceValidate = debounce(validate);

	$: destination, networkId, isInvalidDestination, debounceValidate();
</script>

<label for="destination" class="font-bold px-4.5">Destination:</label>
<Input
	name="destination"
	inputType="text"
	required
	bind:value={destination}
	placeholder={inputPlaceholder}
	spellcheck={false}
/>

{#if invalidDestination}
	<p transition:slide class="text-cyclamen pb-3">Invalid destination address</p>
{/if}

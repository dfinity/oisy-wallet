<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	export let contractAddress = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress);

	const dispatch = createEventDispatcher();
</script>

<div class="stretch pt-2">
	<label for="destination" class="font-bold px-4.5">{$i18n.tokens.text.contract_address}:</label>
	<Input
		name="contractAddress"
		inputType="text"
		required
		bind:value={contractAddress}
		placeholder={$i18n.tokens.placeholder.enter_contract_address}
		spellcheck={false}
	/>
</div>

<ButtonGroup>
	<button type="button" class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<button class="primary block flex-1" type="submit" disabled={invalid} class:opacity-10={invalid}>
		{$i18n.core.text.next}
	</button>
</ButtonGroup>

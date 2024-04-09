<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let contractAddress = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<label for="destination" class="font-bold px-4.5">{$i18n.tokens.text.contract_address}:</label>
	<Input
		name="contractAddress"
		inputType="text"
		required
		bind:value={contractAddress}
		placeholder={$i18n.tokens.placeholder.enter_contract_address}
		spellcheck={false}
	/>

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}
			>{$i18n.core.text.cancel}</button
		>
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			{$i18n.core.text.next}
		</button>
	</div>
</form>

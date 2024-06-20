<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	export let contractAddress = '';
	export let isFirstWizardStep: boolean = false;

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

	<div class="pt-2">
		<ButtonGroup>
			<button
				type="button"
				class="secondary block flex-1"
				on:click={() => dispatch(isFirstWizardStep ? 'icClose' : 'icBack')}
				>{isFirstWizardStep ? $i18n.core.text.cancel : $i18n.core.text.back}</button
			>
			<button
				class="primary block flex-1"
				type="submit"
				disabled={invalid}
				class:opacity-10={invalid}
			>
				{$i18n.core.text.next}
			</button>
		</ButtonGroup>
	</div>
</form>

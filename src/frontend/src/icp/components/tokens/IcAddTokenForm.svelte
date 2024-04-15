<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	export let ledgerCanisterId = '';
	export let indexCanisterId = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(ledgerCanisterId) || isNullishOrEmpty(indexCanisterId);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<label for="ledgerCanisterId" class="font-bold px-4.5"
		>{$i18n.tokens.import.text.ledger_canister_id}:</label
	>
	<Input
		name="ledgerCanisterId"
		inputType="text"
		required
		bind:value={ledgerCanisterId}
		placeholder="_____-_____-_____-_____-cai"
		spellcheck={false}
	/>

	<label for="indexCanisterId" class="font-bold px-4.5"
		>{$i18n.tokens.import.text.index_canister_id}:</label
	>
	<Input
		name="indexCanisterId"
		inputType="text"
		required
		bind:value={indexCanisterId}
		placeholder="_____-_____-_____-_____-cai"
		spellcheck={false}
	/>

	<div class="pt-2">
		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={() => dispatch('icBack')}
				>{$i18n.core.text.cancel}</button
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

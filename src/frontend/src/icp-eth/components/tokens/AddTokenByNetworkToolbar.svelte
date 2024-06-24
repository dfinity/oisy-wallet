<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { createEventDispatcher } from 'svelte';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<ButtonGroup>
	<button type="button" class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<button class="primary block flex-1" type="submit" disabled={invalid} class:opacity-10={invalid}>
		{$i18n.core.text.next}
	</button>
</ButtonGroup>

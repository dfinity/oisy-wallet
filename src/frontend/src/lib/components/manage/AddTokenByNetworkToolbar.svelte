<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<ButtonGroup>
	<button type="button" class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<Button disabled={invalid}>
		{$i18n.core.text.next}
	</Button>
</ButtonGroup>

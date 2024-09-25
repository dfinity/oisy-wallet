<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonPrimary from '$lib/components/ui/ButtonPrimary.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<ButtonGroup>
	<button type="button" class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<ButtonPrimary disabled={invalid}>
		{$i18n.core.text.next}
	</ButtonPrimary>
</ButtonGroup>

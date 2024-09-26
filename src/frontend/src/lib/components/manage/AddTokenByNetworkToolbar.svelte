<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<ButtonGroup>
	<ButtonBack type="button" on:click={() => dispatch('icBack')} />
	<Button disabled={invalid}>
		{$i18n.core.text.next}
	</Button>
</ButtonGroup>

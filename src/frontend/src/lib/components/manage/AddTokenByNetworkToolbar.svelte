<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<ButtonGroup>
	<ButtonBack onclick={() => dispatch('icBack')} />
	<ButtonNext disabled={invalid} />
</ButtonGroup>

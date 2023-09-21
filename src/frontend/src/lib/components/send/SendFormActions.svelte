<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<div class="flex justify-end gap-1">
	<button type="button" class="secondary" on:click={() => dispatch('icClose')}>Cancel</button>
	<button class="primary" type="submit" disabled={invalid} class:opacity-15={invalid}>
		Next
	</button>
</div>

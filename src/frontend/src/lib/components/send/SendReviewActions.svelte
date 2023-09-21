<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let invalid: boolean;

	const dispatch = createEventDispatcher();
</script>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-15={invalid}
		on:click={() => dispatch('icSend')}
	>
		<slot>Send</slot>
	</button>
</div>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Create a dispatcher to handle events like nnsClose
	const dispatch = createEventDispatcher();

	// Handle the close event
	function handleClose() {
		dispatch('nnsClose');
	}
</script>

<!-- Simple mock implementation of the Modal component -->
<div class="mock-modal">
	{#if $$slots.title}
		<div class="mock-modal-title">
			<slot name="title" />
		</div>
	{/if}

	<div class="mock-modal-content">
		<slot />
	</div>

	<button class="mock-modal-close" on:click={handleClose}>Close</button>
</div>

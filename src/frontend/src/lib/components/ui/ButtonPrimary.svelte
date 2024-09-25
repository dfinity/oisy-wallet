<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let disabled = false;
	export let onClick: (() => void) | undefined = undefined;

	const dispatch = createEventDispatcher();

	let handleOnClick = () => {
		onClick?.();
		dispatch('click');
	};
</script>

<button class="primary block flex-1" {disabled} on:click={handleOnClick}>
	<slot />
</button>

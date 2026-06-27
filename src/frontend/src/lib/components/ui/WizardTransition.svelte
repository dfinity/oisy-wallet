<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		children: Snippet;
		// Instead of a number an object is used to make svelte notice any updates need rerender
		transition?: { diff: number };
	}

	let { children, transition = { diff: 0 } }: Props = $props();

	const DEFAULT_OFFSET = 200;
	const ANIMATION_DURATION = 200;
	let absolutOffset = $state(DEFAULT_OFFSET);
	let slideOffset = $derived(
		transition.diff === 0 ? 0 : transition.diff > 0 ? absolutOffset : -absolutOffset
	);
</script>

{#key transition}
	<div
		class="transition"
		bind:clientWidth={absolutOffset}
		in:fly|global={{ x: slideOffset, duration: ANIMATION_DURATION }}
	>
		{@render children()}
	</div>
{/key}

<style lang="scss">
	div {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
	}
</style>

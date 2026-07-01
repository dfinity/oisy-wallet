<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		children: Snippet;
		// An object (rather than a plain number) is used so that Svelte notices updates that require a re-render.
		transition?: { diff: number };
	}

	let { children, transition = { diff: 0 } }: Props = $props();

	const DEFAULT_OFFSET = 200;
	const ANIMATION_DURATION = 200;
	let absoluteOffset = $state(DEFAULT_OFFSET);
	let slideOffset = $derived(
		transition.diff === 0 ? 0 : transition.diff > 0 ? absoluteOffset : -absoluteOffset
	);
</script>

{#key transition}
	<div
		class="transition"
		bind:clientWidth={absoluteOffset}
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

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="scrollable-bar flex gap-2 pb-1 md:flex-wrap md:overflow-visible">
	{@render children()}
</div>

<style>
	.scrollable-bar {
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-mask-image: linear-gradient(
			to right,
			transparent,
			black 20px,
			black calc(100% - 20px),
			transparent
		);
		mask-image: linear-gradient(
			to right,
			transparent,
			black 20px,
			black calc(100% - 20px),
			transparent
		);
	}

	.scrollable-bar::-webkit-scrollbar {
		display: none;
	}

	@media (min-width: 768px) {
		.scrollable-bar {
			overflow-x: visible;
			-webkit-mask-image: none;
			mask-image: none;
		}
	}
</style>

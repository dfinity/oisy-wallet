<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="scrollable-bar items-center px-12 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
	{@render children()}
</div>

<style lang="scss">
	.scrollable-bar {
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
			black 40px,
			black calc(100% - 40px),
			transparent
		);
	}

	.scrollable-bar::-webkit-scrollbar {
		display: none;
	}

	@media (min-width: 768px) {
		.scrollable-bar {
			-webkit-mask-image: none;
			mask-image: none;
		}
	}
</style>

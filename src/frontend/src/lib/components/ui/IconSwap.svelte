<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		swapped: boolean;
		icon: Snippet;
		swappedIcon: Snippet;
	}

	let { swapped, icon, swappedIcon }: Props = $props();
</script>

<!-- Both icons stay mounted so the swap can animate both ways and reverse mid-way.
     The first one sizes the box; the second sits on top of it. -->
<span class="relative inline-flex items-center justify-center">
	<span class="layer flex" class:out={swapped} aria-hidden={swapped}>
		{@render icon()}
	</span>
	<span
		class="layer absolute inset-0 flex items-center justify-center"
		class:out={!swapped}
		aria-hidden={!swapped}
	>
		{@render swappedIcon()}
	</span>
</span>

<style lang="scss">
	.layer {
		transition-property: opacity, scale, filter;
		transition-duration: 300ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}

	.out {
		opacity: 0;
		scale: 0.25;
		filter: blur(4px);
	}

	@media (prefers-reduced-motion: reduce) {
		.layer {
			transition-property: opacity;
			transition-duration: 100ms;
		}

		.out {
			scale: 1;
			filter: none;
		}
	}
</style>

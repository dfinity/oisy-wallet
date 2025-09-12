<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
		display?: boolean;
		children?: Snippet;
	}

	let { position = 'top-left', display = true, children }: Props = $props();
</script>

<div class="relative">
	<div
		class="duration-250 shadow-primary absolute h-2 w-2 rounded-full bg-brand-primary shadow transition"
		class:-bottom-1={position.indexOf('bottom') >= 0}
		class:-left-1={position.indexOf('left') >= 0}
		class:-right-1={position.indexOf('right') >= 0}
		class:-top-1={position.indexOf('top') >= 0}
		class:opacity-0={!display}
		class:opacity-100={display}
	></div>
	{@render children?.()}
</div>

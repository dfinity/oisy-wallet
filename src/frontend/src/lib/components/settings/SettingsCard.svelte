<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		title?: Snippet;
		children?: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="mt-5 rounded-xl bg-primary p-5 first-of-type:mt-0" in:fade>
	<h4 class="mb-5">{@render title?.()}</h4>
	{@render children?.()}
</div>

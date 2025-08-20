<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		onclick: () => void;
		ariaLabel: string;
		styleClass?: string;
	}

	let { children, onclick, ariaLabel, styleClass }: Props = $props();
</script>

<button
	class={`${styleClass ?? ''} h-7 w-7 rounded-md bg-primary p-1 transition-colors duration-700 hover:text-brand-primary active:text-brand-primary`}
	aria-label={ariaLabel}
	{onclick}
>
	{@render children?.()}
</button>

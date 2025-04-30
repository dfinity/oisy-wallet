<script lang="ts">
	import type {Snippet} from "svelte";

	interface Props {
		children: Snippet;
		onclick: () => void;
		ariaLabel: string;
		styleClass?: string | undefined;
	}

	let {children, onclick, ariaLabel, styleClass = undefined}: Props = $props();
</script>

<button
	aria-label={ariaLabel}
	class={`${styleClass ?? ''} h-7 w-7 rounded-md bg-primary p-1 transition-colors duration-700 hover:text-brand-primary active:text-brand-primary`}
	{onclick}
>
	{@render children?.()}
</button>

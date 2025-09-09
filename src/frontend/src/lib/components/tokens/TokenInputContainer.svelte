<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		focused?: boolean;
		error?: boolean;
		styleClass?: string;
		children?: Snippet;
	}

	let { focused = false, error = false, styleClass = '', children }: Props = $props();
</script>

<div
	class={`duration-250 flex w-full items-center rounded-lg border border-solid bg-primary shadow-inner transition-colors focus-within:border-2 ${styleClass ?? ''}`}
	class:border-brand-primary={focused && !error}
	class:border-error-solid={error}
	class:border-tertiary={!focused && !error}
	class:hover:border-brand-primary={!error}
>
	{@render children?.()}
</div>

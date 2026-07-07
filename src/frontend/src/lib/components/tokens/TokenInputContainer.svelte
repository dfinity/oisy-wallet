<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		focused?: boolean;
		error?: boolean;
		readOnly?: boolean;
		styleClass?: string;
		children: Snippet;
	}

	let { focused = false, error = false, readOnly = false, styleClass, children }: Props = $props();
</script>

<div
	class={`flex w-full items-center rounded-lg border border-solid bg-primary shadow-inner transition-colors duration-250 ${styleClass ?? ''}`}
	class:border-brand-primary={!readOnly && focused && !error}
	class:border-error-solid={error}
	class:border-tertiary={!error && (readOnly || !focused)}
	class:focus-within:border-2={!readOnly}
	class:hover:border-brand-primary={!readOnly && !error}
>
	{@render children()}
</div>

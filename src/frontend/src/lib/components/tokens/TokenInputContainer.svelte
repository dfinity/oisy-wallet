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
	class={`flex w-full items-center rounded-lg transition-colors duration-250 ${styleClass ?? ''}`}
	class:bg-primary={!readOnly}
	class:border={!readOnly}
	class:border-brand-primary={!readOnly && focused && !error}
	class:border-error-solid={!readOnly && error}
	class:border-solid={!readOnly}
	class:border-tertiary={!readOnly && !error && !focused}
	class:focus-within:border-2={!readOnly}
	class:hover:border-brand-primary={!readOnly && !error}
	class:shadow-inner={!readOnly}
>
	{@render children()}
</div>

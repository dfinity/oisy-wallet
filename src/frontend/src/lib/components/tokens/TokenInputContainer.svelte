<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		focused?: boolean;
		error?: boolean;
		// `muted` marks the box as a read-only readout: it drops the hover/focus
		// border affordance so it doesn't invite editing, but keeps the active
		// surface so an inner control — e.g. a token selector — still reads as
		// interactive. The muted amount field greys itself (see `TokenInput`).
		muted?: boolean;
		styleClass?: string;
		children: Snippet;
	}

	let { focused = false, error = false, muted = false, styleClass, children }: Props = $props();
</script>

<div
	class={`flex w-full items-center rounded-lg border border-solid bg-primary shadow-inner transition-colors duration-250 ${styleClass ?? ''}`}
	class:border-brand-primary={!muted && focused && !error}
	class:border-error-solid={error}
	class:border-tertiary={!error && (muted || !focused)}
	class:focus-within:border-2={!muted}
	class:hover:border-brand-primary={!muted && !error}
>
	{@render children()}
</div>

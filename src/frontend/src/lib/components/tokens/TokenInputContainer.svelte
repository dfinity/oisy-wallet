<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		focused?: boolean;
		error?: boolean;
		// `muted` styles the box as a read-only readout (grey fill, no hover/focus
		// affordance) while leaving any inner controls — e.g. a token selector —
		// interactive. Used for derived amounts that can't be typed into.
		muted?: boolean;
		styleClass?: string;
		children: Snippet;
	}

	let { focused = false, error = false, muted = false, styleClass, children }: Props = $props();
</script>

<div
	class={`flex w-full items-center rounded-lg border border-solid transition-colors duration-250 ${styleClass ?? ''}`}
	class:bg-disabled={muted}
	class:bg-primary={!muted}
	class:border-brand-primary={!muted && focused && !error}
	class:border-disabled={muted && !error}
	class:border-error-solid={error}
	class:border-tertiary={!muted && !focused && !error}
	class:focus-within:border-2={!muted}
	class:hover:border-brand-primary={!muted && !error}
	class:shadow-inner={!muted}
>
	{@render children()}
</div>

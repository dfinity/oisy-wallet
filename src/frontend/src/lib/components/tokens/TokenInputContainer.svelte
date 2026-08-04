<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		focused?: boolean;
		error?: boolean;
		readOnlyAmount?: boolean;
		// The field can neither be typed into nor opened: it keeps its frame but
		// drops the hover affordance, which would otherwise promise an interaction
		// that isn't there.
		inert?: boolean;
		styleClass?: string;
		children: Snippet;
	}

	let {
		focused = false,
		error = false,
		readOnlyAmount = false,
		inert = false,
		styleClass,
		children
	}: Props = $props();
</script>

<div
	class={`flex w-full items-center rounded-lg transition-colors duration-250 ${styleClass ?? ''}`}
	class:bg-primary={!readOnlyAmount}
	class:border={!readOnlyAmount}
	class:border-brand-primary={!readOnlyAmount && focused && !error}
	class:border-error-solid={!readOnlyAmount && error}
	class:border-solid={!readOnlyAmount}
	class:border-tertiary={!readOnlyAmount && !error && !focused}
	class:cursor-not-allowed={inert}
	class:focus-within:border-2={!readOnlyAmount && !inert}
	class:hover:border-brand-primary={!readOnlyAmount && !error && !inert}
	class:shadow-inner={!readOnlyAmount}
>
	{@render children()}
</div>

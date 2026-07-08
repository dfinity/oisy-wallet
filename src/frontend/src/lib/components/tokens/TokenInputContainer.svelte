<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		focused?: boolean;
		error?: boolean;
		readOnlyAmount?: boolean;
		styleClass?: string;
		children: Snippet;
	}

	let {
		focused = false,
		error = false,
		readOnlyAmount = false,
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
	class:focus-within:border-2={!readOnlyAmount}
	class:hover:border-brand-primary={!readOnlyAmount && !error}
	class:shadow-inner={!readOnlyAmount}
>
	{@render children()}
</div>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BadgeVariant } from '$lib/types/style';

	interface Props {
		children?: Snippet;
		styleClass?: string | undefined;
		testId?: string | undefined;
		variant?: BadgeVariant;
	}

	let {
		children,
		styleClass = undefined,
		testId = undefined,
		variant = 'default'
	}: Props = $props();

	const variantClassNames = {
		default: 'bg-secondary text-primary border border-secondary',
		info: 'bg-brand-subtle-20 text-brand-primary',
		error: 'bg-error-subtle-20 text-error-primary',
		warning: 'bg-warning-subtle-20 text-warning-primary',
		success: 'bg-success-subtle-20 text-success-primary',
		outline: 'border border-tertiary bg-off-white'
	};
</script>

<span
	data-tid={testId}
	class="inline-flex h-fit w-full items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold {variantClassNames[
		variant
	]} {styleClass ?? ''}"
>
	<span class="inline-block min-w-0 truncate">
		{@render children?.()}
	</span>
</span>

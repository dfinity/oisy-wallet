<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { BadgeVariant } from '$lib/types/style';

	interface Props {
		children?: Snippet;
		styleClass?: string;
		testId?: string;
		variant?: BadgeVariant;
		width?: 'w-full' | 'w-fit';
	}

	let {
		children,
		styleClass = undefined,
		testId = undefined,
		variant = 'default',
		width = 'w-full'
	}: Props = $props();

	const variantClassNames = {
		default: 'bg-secondary text-primary border border-secondary font-semibold',
		info: 'bg-brand-subtle-20 text-brand-primary font-semibold',
		error: 'bg-error-subtle-20 text-error-primary font-semibold',
		warning: 'bg-warning-subtle-20 text-warning-primary font-semibold',
		success: 'bg-success-subtle-20 text-success-primary font-semibold',
		outline: 'border border-tertiary bg-primary font-semibold',
		disabled: 'bg-tertiary-inverted text-white font-semibold',
		'nft-trait': 'border border-secondary bg-primary font-semibold',
		'nft-spam': 'bg-warning-primary text-white font-semibold',
		eligible: 'bg-success-primary text-white font-semibold',
		'not-eligible': 'bg-primary-inverted text-white opacity-16 font-semibold',
		transparent: 'text-primary border border-secondary'
	};
</script>

<span
	class={`inline-flex h-fit items-center gap-1 rounded px-2 py-0.5 text-xs ${
		variantClassNames[variant]
	} ${styleClass ?? ''} ${width}`}
	data-tid={testId}
>
	<span class="inline-block min-w-0 truncate">
		{@render children?.()}
	</span>
</span>

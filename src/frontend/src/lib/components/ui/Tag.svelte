<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TagVariant } from '$lib/types/style';

	interface Props {
		children: Snippet;
		ariaHidden?: boolean;
		variant?: TagVariant;
		size?: 'xs' | 'sm' | 'md';
	}

	let { children, ariaHidden = false, variant = 'default', size = 'xs' }: Props = $props();

	const variantClassNames = {
		default: 'bg-primary text-primary border border-secondary',
		emphasis: 'bg-error-primary text-white',
		info: 'bg-brand-subtle-20 text-brand-primary',
		error: 'bg-error-subtle-20 text-error-primary',
		warning: 'bg-warning-subtle-20 text-warning-primary',
		success: 'bg-success-subtle-20 text-success-primary',
		outline: 'border border-tertiary bg-off-white'
	};
</script>

<span
	class="rounded-md {variantClassNames[variant]}"
	class:md:px-2={size === 'sm' || size === 'md'}
	class:md:py-0={size === 'xs'}
	class:md:py-1={size === 'sm' || size === 'md'}
	class:px-1={size === 'sm' || size === 'md'}
	class:px-1.5={size === 'xs'}
	class:py-0={size === 'xs'}
	class:py-0.5={size === 'sm' || size === 'md'}
	class:text-sm={size === 'xs' || size === 'md'}
	class:text-xs={size === 'sm'}
	aria-hidden={ariaHidden}
>
	{@render children?.()}
</span>

<script lang="ts">
	import type { TagVariant } from '$lib/types/style';

	export let ariaHidden = false;

	const variantClassNames = {
		default: 'bg-primary text-primary border border-secondary',
		emphasis: 'bg-error-primary text-white',
		info: 'bg-brand-subtle-20 text-brand-primary',
		error: 'bg-error-subtle-20 text-error-primary',
		warning: 'bg-warning-subtle-20 text-warning-primary',
		success: 'bg-success-subtle-20 text-success-primary',
		outline: 'border border-tertiary bg-off-white'
	};

	export let variant: TagVariant = 'default';
	export let size: 'xs' | 'sm' | 'md' = 'sm';
</script>

<span
	aria-hidden={ariaHidden}
	class="rounded-md px-1.5 py-1 text-{size} {variantClassNames[variant]}"
	class:px-1={size === 'xs'}
	class:pt-0.75={size === 'xs'}
	class:pb-0.5={size === 'xs'}
	class:px-1.5={size === 'sm' || size === 'md'}
	class:pt-0={size === 'sm' || size === 'md'}
	class:pb-0={size === 'sm' || size === 'md'}
	class:md:px-2={size === 'xs' || size === 'sm' || size === 'md'}
	class:md:pt-0.75={size === 'xs'}
	class:md:pb-1={size === 'xs'}
	class:md:pt-0={size === 'sm' || size === 'md'}
	class:md:pb-0={size === 'sm' || size === 'md'}
>
	<slot />
</span>

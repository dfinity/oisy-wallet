<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		imageUrl?: string;
		ariaLabel?: string;
		shadow?: 'inset' | 'none';
		size?: 'auto' | 'contained' | 'cover';
		styleClass?: string;
		children?: Snippet;
	}

	const {
		imageUrl,
		ariaLabel,
		shadow = 'inset',
		size = 'auto',
		styleClass,
		children
	}: Props = $props();

	const { hasWidthClass, hasHeightClass } = $derived.by(() => ({
		hasWidthClass: styleClass?.includes('w-') ?? false,
		hasHeightClass: styleClass?.includes('h-') ?? false
	}));
</script>

<div
	aria-label={ariaLabel}
	class={`flex bg-center ${styleClass}`}
	class:w-full={!hasWidthClass}
	class:h-full={!hasHeightClass}
	class:bg-cover={size === 'cover'}
	class:bg-contained={size === 'contained'}
	class:bg-auto={size === 'auto'}
	class:animate-pulse={isNullish(imageUrl)}
	class:bg-disabled-alt={isNullish(imageUrl)}
	style={`background-image: url(${imageUrl}); ${shadow === 'inset' ? 'box-shadow: inset 0px 0px 5px 1px #0000000D' : ''}`}
>
	{@render children?.()}
</div>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		imageUrl?: string;
		ariaLabel?: string;
		shadow?: 'inset' | 'none';
		size?: 'auto' | 'contain' | 'cover';
		styleClass?: string;
		testId?: string;
		children?: Snippet;
	}

	const {
		imageUrl,
		ariaLabel,
		shadow = 'inset',
		size = 'auto',
		styleClass,
		testId,
		children
	}: Props = $props();

	const { hasWidthClass, hasHeightClass } = $derived.by(() => ({
		hasWidthClass: styleClass?.includes('w-') ?? false,
		hasHeightClass: styleClass?.includes('h-') ?? false
	}));
</script>

<div
	style={`background-image: url(${imageUrl}); ${shadow === 'inset' ? 'box-shadow: inset 0px 0px 5px 1px #0000000D' : ''}`}
	class={`flex bg-center bg-no-repeat ${styleClass}`}
	class:animate-pulse={isNullish(imageUrl)}
	class:bg-auto={size === 'auto'}
	class:bg-contain={size === 'contain'}
	class:bg-cover={size === 'cover'}
	class:bg-disabled-alt={isNullish(imageUrl)}
	class:h-full={!hasHeightClass}
	class:w-full={!hasWidthClass}
	aria-label={ariaLabel}
	data-tid={testId}
>
	{@render children?.()}
</div>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import { trackEvent as trackEventServices } from '$lib/services/analytics.services';
	import type { TrackEventParams } from '$lib/types/analytics';

	interface Props {
		children?: Snippet;
		href: string;
		ariaLabel: string;
		iconSize?: string;
		iconVisible?: boolean;
		inline?: boolean;
		color?: 'blue' | 'inherit';
		fullWidth?: boolean;
		styleClass?: string;
		trackEvent?: TrackEventParams;
		testId?: string;
		asMenuItem?: boolean;
		asMenuItemCondensed?: boolean;
		asButton?: boolean;
		iconAsLast?: boolean;
	}

	let {
		children,
		href,
		ariaLabel,
		iconSize = '20',
		iconVisible = true,
		inline = false,
		color = 'inherit',
		fullWidth = false,
		styleClass = '',
		trackEvent,
		testId,
		asMenuItem = false,
		asMenuItemCondensed = false,
		asButton = false,
		iconAsLast = false
	}: Props = $props();

	const onclick = () => {
		if (isNullish(trackEvent)) {
			return;
		}

		trackEventServices(trackEvent);
	};
</script>

<a
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	class="inline-flex items-center gap-2 no-underline {styleClass}"
	class:active:text-brand-primary-alt={color === 'inherit' && !asButton && !asMenuItem}
	class:active:text-inherit={color === 'blue' && !asButton && !asMenuItem}
	class:as-button={asButton}
	class:flex-row-reverse={iconAsLast}
	class:hover:text-brand-primary-alt={color === 'inherit' && !asButton && !asMenuItem}
	class:hover:text-inherit={color === 'blue' && !asButton && !asMenuItem}
	class:text-brand-primary-alt={!asButton && !asMenuItem}
	aria-label={ariaLabel}
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	data-tid={testId}
	class:w-full={fullWidth}
	class:nav-item={asMenuItem}
	class:nav-item-condensed={asMenuItemCondensed}
	{onclick}
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	{@render children?.()}
</a>

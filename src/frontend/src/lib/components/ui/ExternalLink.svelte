<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import { trackEvent as trackEventServices } from '$lib/services/analytics.services';
	import type { TrackEventParams } from '$lib/types/analytics';

	export let href: string;
	export let ariaLabel: string;
	export let iconSize = '20';
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let fullWidth = false;
	export let styleClass = '';
	export let trackEvent: TrackEventParams | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let asMenuItem = false;
	export let asMenuItemCondensed = false;
	export let asButton = false;

	const onClick = async () => {
		if (isNullish(trackEvent)) {
			return;
		}

		await trackEventServices(trackEvent);
	};
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class="gap-2 inline-flex items-center no-underline {styleClass}"
	aria-label={ariaLabel}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	data-tid={testId}
	class:as-button={asButton}
	class:text-brand-primary={color === 'blue' && !asButton && !asMenuItem}
	class:hover:text-inherit={color === 'blue' && !asButton && !asMenuItem}
	class:active:text-inherit={color === 'blue' && !asButton && !asMenuItem}
	class:hover:text-brand-primary={color === 'inherit' && !asButton && !asMenuItem}
	class:active:text-brand-primary={color === 'inherit' && !asButton && !asMenuItem}
	class:w-full={fullWidth}
	class:nav-item={asMenuItem}
	class:nav-item-condensed={asMenuItemCondensed}
	on:click={onClick}
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	<slot />
</a>

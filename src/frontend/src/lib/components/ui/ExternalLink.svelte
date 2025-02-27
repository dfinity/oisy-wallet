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

	// Has to be passed as prop since we potentially want to additionally execute the doTrackEvent
	// function. There seems no other way to call the on:click passed to this component manually
	export let onClick: undefined | ((e: MouseEvent) => void);

	const doTrackEvent = async () => {
		if (!isNullish(trackEvent)) {
			await trackEventServices(trackEvent);
		}
	};
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class="inline-flex items-center gap-2 no-underline {styleClass}"
	aria-label={ariaLabel}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	data-tid={testId}
	class:as-button={asButton}
	class:text-brand-primary={!asButton && !asMenuItem}
	class:hover:text-inherit={color === 'blue' && !asButton && !asMenuItem}
	class:active:text-inherit={color === 'blue' && !asButton && !asMenuItem}
	class:hover:text-brand-primary={color === 'inherit' && !asButton && !asMenuItem}
	class:active:text-brand-primary={color === 'inherit' && !asButton && !asMenuItem}
	class:w-full={fullWidth}
	class:nav-item={asMenuItem}
	class:nav-item-condensed={asMenuItemCondensed}
	on:click={(e) => {
		doTrackEvent();
		if (onClick) {onClick(e);}
	}}
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	<slot />
</a>

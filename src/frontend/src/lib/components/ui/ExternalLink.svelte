<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import { trackEvent } from '$lib/services/analytics.services';
	import type { TrackEventParams } from '$lib/types/analytics';

	export let href: string;
	export let ariaLabel: string;
	export let iconSize = '20';
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let fullWidth = false;
	export let styleClass = '';
	export let trackEventParams: TrackEventParams | undefined = undefined;

	const onClick = async () => {
		if (isNullish(trackEventParams)) {
			return;
		}

		await trackEvent(trackEventParams);
	};
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class="inline-flex items-center gap-2 no-underline {styleClass}"
	aria-label={ariaLabel}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	class:text-brand-primary={color === 'blue'}
	class:hover:text-inherit={color === 'blue'}
	class:active:text-inherit={color === 'blue'}
	class:hover:text-brand-primary={color === 'inherit'}
	class:active:text-brand-primary={color === 'inherit'}
	class:w-full={fullWidth}
	on:click={onClick}
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	<slot />
</a>

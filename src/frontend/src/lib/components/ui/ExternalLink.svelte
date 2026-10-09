<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import {
		EXTERNAL_LINK_POPUP_HEIGHT,
		EXTERNAL_LINK_POPUP_WIDTH
	} from '$lib/constants/app.constants';
	import { trackEvent as trackEventServices } from '$lib/services/analytics.services';
	import type { TrackEventParams } from '$lib/types/analytics';
	import { isDesktop, isPWAStandalone } from '$lib/utils/device.utils';
	import { popupCenter } from '$lib/utils/window.utils';

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

	// In a desktop PWA, a `target="_blank"` link opens in the last used browser window, which can
	// sit on another desktop and pull the focus there. A popup window opens over the PWA instead.
	// Modifier clicks keep the browser default so a real tab is still one Cmd/Ctrl-click away.
	const openInPopup = (event: MouseEvent): boolean => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return false;
		}

		if (!isDesktop() || !isPWAStandalone()) {
			return false;
		}

		const features = popupCenter({
			width: EXTERNAL_LINK_POPUP_WIDTH,
			height: EXTERNAL_LINK_POPUP_HEIGHT
		});

		if (isNullish(features)) {
			return false;
		}

		let protocol: string;
		try {
			({ protocol } = new URL(href, window.location.href));
		} catch {
			return false;
		}

		if (protocol !== 'http:' && protocol !== 'https:') {
			return false;
		}

		// Not `noopener` in the features: with it, a Safari web app ignores the popup size for links
		// on the same site (e.g. docs.oisy.com) and opens a full-size window. The opener is cut by
		// hand instead, and the `Referrer-Policy: same-origin` header already withholds the referrer.
		const popup = window.open(href, '_blank', features);

		if (isNullish(popup)) {
			return false;
		}

		popup.opener = null;

		return true;
	};

	const onclick = (event: MouseEvent) => {
		if (nonNullish(trackEvent)) {
			trackEventServices(trackEvent);
		}

		if (openInPopup(event)) {
			event.preventDefault();
		}
	};
</script>

<a
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	class="inline-flex items-center gap-2 no-underline {styleClass}"
	class:active:text-brand-primary-alt={color === 'inherit' && !asButton && !asMenuItem}
	class:active:text-brand-secondary={color === 'blue' && !asButton && !asMenuItem}
	class:as-button={asButton}
	class:flex-row-reverse={iconAsLast}
	class:hover:text-brand-primary-alt={color === 'inherit' && !asButton && !asMenuItem}
	class:hover:text-brand-secondary={color === 'blue' && !asButton && !asMenuItem}
	class:nav-item={asMenuItem}
	class:nav-item-condensed={asMenuItemCondensed}
	class:text-brand-primary-alt={!asButton && !asMenuItem}
	class:w-full={fullWidth}
	aria-label={ariaLabel}
	data-tid={testId}
	{href}
	{onclick}
	rel="external noopener noreferrer"
	target="_blank"
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	{@render children?.()}
</a>

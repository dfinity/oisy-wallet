<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		src: string;
		ariaLabel?: string;
		role?: string;
		width?: string;
		height?: string;
		rounded?: boolean;
		fitHeight?: boolean;
		grayscale?: boolean;
		styleClass?: string;
		testId?: string;
		onLoad?: () => void;
		onError?: () => void;
		fallback?: Snippet;
	}

	let {
		src,
		ariaLabel = '',
		role = 'presentation',
		width,
		height,
		rounded = false,
		fitHeight = false,
		grayscale = false,
		styleClass,
		testId,
		onLoad,
		onError,
		fallback
	}: Props = $props();
</script>

<video
	style={fitHeight ? `max-width: inherit; height: ${height};` : undefined}
	class={styleClass}
	class:grayscale
	class:rounded-full={rounded}
	aria-label={ariaLabel}
	autoplay
	data-tid={testId}
	{height}
	loop
	muted
	onerror={onError}
	onloadeddata={onLoad}
	playsinline
	{role}
	{width}
>
	<source {src} />
	{#if nonNullish(fallback)}
		{@render fallback()}
	{:else}
		{$i18n.core.warning.video_not_supported}
	{/if}
</video>

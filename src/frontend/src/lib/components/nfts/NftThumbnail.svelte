<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { loadNftThumbnail } from '$lib/services/nft-thumbnail.services';

	interface Props {
		imageUrl?: string;
		// Gets the small copy of an SVG media, or the original URL for any other media. Nothing is rendered until the
		// media type is known, so an SVG is never shown at full size in the meantime.
		children: Snippet<[{ imageUrl?: string }]>;
	}

	let { imageUrl, children }: Props = $props();

	let container = $state<HTMLDivElement | undefined>();

	// Drawing a copy briefly holds the full-size SVG in memory, so only cards near the screen are drawn: a long list
	// of SVG NFTs is not drawn all at once.
	let nearViewport = $state(false);

	$effect(() => {
		if (isNullish(container) || nearViewport) {
			return;
		}

		if (typeof IntersectionObserver === 'undefined') {
			nearViewport = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some(({ isIntersecting }) => isIntersecting)) {
					nearViewport = true;
				}
			},
			{ rootMargin: '200px' }
		);

		observer.observe(container);

		return () => observer.disconnect();
	});
</script>

<div bind:this={container} class="h-full w-full">
	{#if isNullish(imageUrl)}
		{@render children({ imageUrl })}
	{:else if nearViewport}
		{#await loadNftThumbnail(imageUrl) then thumbnailUrl}
			{@render children({ imageUrl: thumbnailUrl ?? imageUrl })}
		{:catch}
			{@render children({ imageUrl })}
		{/await}
	{/if}
</div>

<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		src: string;
		alt?: string;
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
	}

	let {
		src,
		alt = '',
		role = 'presentation',
		width,
		height,
		rounded = false,
		fitHeight = false,
		grayscale = false,
		styleClass,
		testId,
		onLoad,
		onError
	}: Props = $props();

	const onErrorHandler = (e: unknown) => {
		onError?.();

		console.log('Image failed to load:', src, e);
	};

	let style = $derived(fitHeight ? `max-width: inherit; height: ${height};` : undefined);

	let asDocument = $state(false);

	let svgMarkup = $state<string | undefined>();

	const checkIfDocument = async () => {
		try {
			const res = await fetch(src);

			const type = res.headers.get('Content-Type') ?? '';

			console.log('Checking if image is a document:', type);

			// only inspect if it's actually an SVG
			if (!type.includes('image/svg+xml')) {
				return;
			}

			const text = await res.text();

			svgMarkup = text;

			const hasNested = /<image[^>]+href=/i.test(text);

			console.log('Image is a document:', hasNested, text);

			if (hasNested) {
				asDocument = true;
			}
		} catch (err: unknown) {
			console.log('Failed to check if image is a document:', err, src);
			// do nothing
		}
	};

	$effect(() => {
		[src];

		untrack(() => checkIfDocument());
	});
</script>

{#if asDocument}
	<div
		{style}
		class={styleClass}
		aria-label={alt}
		data-tid={testId}
		{role}
	>
		{@html svgMarkup}
	</div>
	<iframe
		{style}
		class={styleClass}
		data-tid={testId}
		{height}
		{role}
		{src}
		title={alt}
		{width}
	></iframe>
{:else}
	<img
		{style}
		class={styleClass}
		class:grayscale
		class:rounded-full={rounded}
		{alt}
		data-tid={testId}
		decoding="async"
		{height}
		loading="lazy"
		onerror={onErrorHandler}
		onload={onLoad}
		{role}
		{src}
		{width}
	/>
{/if}

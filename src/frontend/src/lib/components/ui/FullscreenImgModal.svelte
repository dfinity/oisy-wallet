<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import UnsupportedMediaType from '$lib/components/icons/nfts/UnsupportedMediaType.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Video from '$lib/components/ui/Video.svelte';
	import { MediaType } from '$lib/enums/media-type';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Option } from '$lib/types/utils';
	import { getMediaType } from '$lib/utils/nfts.utils';

	interface Props {
		imageSrc: string;
	}

	let { imageSrc }: Props = $props();

	// Value `null` means that the media type is not supported, or it is not possible to fetch the type.
	// Value `undefined` means that we have not yet fetched the media type.
	let mediaType = $state<Option<MediaType>>();

	const fetchMediaType = async (mediaUrl: string): Promise<MediaType | null> => {
		try {
			const url = new URL(mediaUrl);

			const response = await fetch(url.href, { method: 'HEAD' });

			const type = response.headers.get('Content-Type');

			if (isNullish(type)) {
				return null;
			}

			return getMediaType(type) ?? null;
		} catch (_: unknown) {
			// The error here is caused by `fetch`, which can fail for various reasons (network error, CORS, DNS, etc).
			// Empirically, it happens mostly for CORS policy block: we can't be sure that the media is valid or not.
			// Ideally, we should load this data in a backend service to avoid CORS issues.
		}

		return null;
	};

	const updateMediaType = async () => {
		mediaType = await fetchMediaType(imageSrc);
	};

	onMount(async () => {
		await updateMediaType();
	});

	$effect(() => {
		[imageSrc];

		untrack(() => updateMediaType());
	});
</script>

<div class="fixed top-0 right-0 bottom-0 left-0 z-10" transition:fade>
	<div class="pointer-events-none absolute top-3 right-3 z-10 md:top-8 md:right-8">
		<IconClose />
	</div>
	<div class="pointer-events-none absolute inset-0 z-9 grid place-items-center">
		{#if mediaType === MediaType.Img}
			<Img src={imageSrc} styleClass="rounded-lg w-auto h-auto block max-h-[90dvh] max-w-[90dvw]" />
		{:else if mediaType === MediaType.Video}
			<Video
				src={imageSrc}
				styleClass="rounded-lg w-auto h-auto block max-h-[90dvh] max-w-[90dvw]"
			/>
		{:else if mediaType === null}
			<UnsupportedMediaType />
		{:else}
			<Spinner />
		{/if}
	</div>
	<Backdrop on:nnsClose={() => modalStore.close()} />
</div>

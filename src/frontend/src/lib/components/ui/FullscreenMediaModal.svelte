<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import { onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import UnsupportedMediaType from '$lib/components/icons/nfts/UnsupportedMediaType.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Video from '$lib/components/ui/Video.svelte';
	import { MediaType } from '$lib/enums/media-type';
	import { extractMediaTypeAndSize } from '$lib/services/url.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Option } from '$lib/types/utils';

	interface Props {
		mediaSrc: string;
	}

	let { mediaSrc }: Props = $props();

	// Value `null` means that the media type is not supported, or it is not possible to fetch the type.
	// Value `undefined` means that we have not yet fetched the media type.
	let mediaType = $state<Option<MediaType>>();

	const updateMediaType = async () => {
		const { type } = await extractMediaTypeAndSize(mediaSrc);

		mediaType = type;
	};

	onMount(async () => {
		await updateMediaType();
	});

	$effect(() => {
		[mediaSrc];

		untrack(() => updateMediaType());
	});
</script>

<div class="fixed top-0 right-0 bottom-0 left-0 z-10" transition:fade>
	<div class="pointer-events-none absolute top-3 right-3 z-10 md:top-8 md:right-8">
		<IconClose />
	</div>
	<div class="pointer-events-none absolute inset-0 z-9 grid place-items-center">
		{#if mediaType === MediaType.Img}
			<Img src={mediaSrc} styleClass="rounded-lg w-auto h-auto block max-h-[90dvh] max-w-[90dvw]" />
		{:else if mediaType === MediaType.Video}
			<Video
				src={mediaSrc}
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

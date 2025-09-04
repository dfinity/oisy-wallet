<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import Img from '$lib/components/ui/Img.svelte';

	interface Props {
		imageSrc: string;
	}

	let { imageSrc }: Props = $props();
</script>

<div class="fixed bottom-0 left-0 right-0 top-0 z-10" transition:fade>
	<div class="pointer-events-none absolute right-3 top-3 z-10 md:right-8 md:top-8"
		><IconClose /></div
	>
	<div class="z-9 pointer-events-none absolute inset-0 grid place-items-center">
		<Img src={imageSrc} styleClass="rounded-lg w-auto h-auto block max-h-[90dvh] max-w-[90dvw]" />
	</div>
	<Backdrop on:nnsClose={() => modalStore.close()} />
</div>

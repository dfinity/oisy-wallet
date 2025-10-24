<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import { fade } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		imageSrc: string;
	}

	let { imageSrc }: Props = $props();
</script>

<div class="fixed top-0 right-0 bottom-0 left-0 z-10" transition:fade>
	<div class="pointer-events-none absolute top-3 right-3 z-10 md:top-8 md:right-8"
		><IconClose /></div
	>
	<div class="pointer-events-none absolute inset-0 z-9 grid place-items-center">
		<Img src={imageSrc} styleClass="rounded-lg w-auto h-auto block max-h-[90dvh] max-w-[90dvw]" />
	</div>
	<Backdrop on:nnsClose={() => modalStore.close()} />
</div>

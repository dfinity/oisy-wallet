<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="fixed bottom-0 left-0 right-0 top-0 z-10" transition:fade>
	<div class="pointer-events-none absolute right-3 top-3 z-10 md:right-8 md:top-8"
		><IconClose /></div
	>
	<div class="z-9 pointer-events-none absolute inset-0 grid place-items-center">
		<div class="fullscreen-modal max-h-[90vh] max-w-[90vw] overflow-hidden">
			{@render children()}
		</div>
	</div>
	<Backdrop on:nnsClose={() => modalStore.close()} />
</div>

<style lang="scss">
	/* Ensure images (or videos, etc.) shrink but never upscale */
	:global(.fullscreen-modal img) {
		max-width: 90dvw;
		max-height: 90dvh;
		width: auto;
		height: auto;
		display: block;
	}
</style>

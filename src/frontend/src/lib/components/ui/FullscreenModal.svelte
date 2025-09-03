<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	interface Props {
		children: Snippet;
		open: boolean;
	}

	let { children, open = $bindable(false) }: Props = $props();
</script>

{#if open}
	<div class="z-99 fixed bottom-0 left-0 right-0 top-0" transition:fade>
		<div class="pointer-events-none absolute right-3 top-3 z-10"><IconClose /></div>
		<div class="z-9 pointer-events-none absolute inset-0 grid place-items-center">
			<div class="fullscreen-modal max-h-[90vh] max-w-[90vw] overflow-hidden">
				{@render children()}
			</div>
		</div>
		<Backdrop on:nnsClose={() => (open = false)} />
	</div>
{/if}

<style>
	/* Ensure images (or videos, etc.) shrink but never upscale */
	:global(.fullscreen-modal img) {
		max-width: 90vw;
		max-height: 90vh;
		width: auto;
		height: auto;
		display: block;
	}
</style>

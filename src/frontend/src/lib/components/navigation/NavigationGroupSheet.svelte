<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible: boolean;
		label: string;
		onClose: () => void;
		// When the sheet closes because the user picked an item and the route is
		// changing, skip the exit animation: an animated blurred scrim lingering over
		// the freshly-rendered page reads as a flicker (worst on iOS Safari, where
		// backdrop-filter is expensive to animate). The open and manual-dismiss
		// animations are kept.
		instantClose?: boolean;
		testId?: string;
		children: Snippet;
	}

	let { visible, label, onClose, instantClose = false, testId, children }: Props = $props();
</script>

<!--
	A navigation group's bottom sheet. It is rendered inside the bottom bar's
	stacking context but at a NEGATIVE z BELOW the hump SVG + filler (-z-[1]), so
	the whole bar — buttons, cradle, and the raised hump around it — paints on top
	and stays visible (at -z-[1] the sheet, being later in the DOM, painted over
	the hump). The bar context (z-12) still sits above the page, so the scrim dims
	the page; the scrim stops at the bar top so the bar itself is never dimmed, and
	the panel is offset just above the bar. It deliberately does not set
	bottomSheetOpenStore (which would hide the bar).
-->
{#if visible}
	<div class="pointer-events-none fixed inset-0 -z-[2]" data-tid={testId}>
		<button
			class="pointer-events-auto absolute inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-[var(--backdrop)] backdrop-blur-sm"
			aria-label={$i18n.core.text.close}
			onclick={onClose}
			tabindex="-1"
			type="button"
			in:fade={{ duration: 150 }}
			out:fade={{ duration: instantClose ? 0 : 150 }}
		></button>

		<div
			class="pointer-events-auto absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-t-3xl bg-primary px-4 pt-3 pb-5 shadow-[0_-10px_34px_rgba(20,30,60,0.16)]"
			aria-label={label}
			role="dialog"
			in:fly={{ y: 320, duration: 200 }}
			out:fly={{ y: 320, duration: instantClose ? 0 : 200 }}
		>
			<div class="mx-auto mb-3 h-1 w-9 rounded-full bg-tertiary"></div>
			<h2 class="mb-3 px-1 text-base font-semibold text-primary">{label}</h2>
			<div class="grid grid-cols-3 gap-2.5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

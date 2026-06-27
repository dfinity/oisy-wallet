<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible: boolean;
		label: string;
		onClose: () => void;
		testId?: string;
		children: Snippet;
	}

	let { visible, label, onClose, testId, children }: Props = $props();
</script>

<!--
	A navigation group's bottom sheet. It is a custom panel that sits ABOVE the
	bottom bar (offset by the bar height) rather than the gix BottomSheet, which
	anchors flush to the viewport bottom and would cover the bar. The whole overlay
	sits at z-10, below the bar (z-12), so the bar/cradle stay visible and
	un-dimmed while the sheet is open. It deliberately does not set
	bottomSheetOpenStore (which would hide the bar).
-->
{#if visible}
	<div class="fixed inset-0 z-10" data-tid={testId}>
		<button
			class="absolute inset-0 h-full w-full bg-[var(--backdrop)] backdrop-blur-sm"
			aria-label={$i18n.core.text.close}
			onclick={onClose}
			tabindex="-1"
			type="button"
			transition:fade={{ duration: 150 }}
		></button>

		<div
			class="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-t-3xl bg-primary px-4 pt-3 pb-5 shadow-[0_-10px_34px_rgba(20,30,60,0.16)]"
			transition:fly={{ y: 320, duration: 200 }}
		>
			<div class="mx-auto mb-3 h-1 w-9 rounded-full bg-tertiary"></div>
			<h2 class="mb-3 px-1 text-base font-semibold text-primary">{label}</h2>
			<div class="grid grid-cols-3 gap-2.5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

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
	A navigation group's bottom sheet. It is rendered inside the bottom bar's
	stacking context but at a NEGATIVE z, so the bar buttons (incl. the cradle)
	paint on top and stay visible — while the whole bar context (z-12) still sits
	above the page, so the scrim dims the page. The scrim stops at the bar top so
	the bar itself is never dimmed, and the panel is offset just above the bar. It
	deliberately does not set bottomSheetOpenStore (which would hide the bar).
-->
{#if visible}
	<div class="pointer-events-none fixed inset-0 -z-[1]" data-tid={testId}>
		<button
			class="pointer-events-auto absolute inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-[var(--backdrop)] backdrop-blur-sm"
			aria-label={$i18n.core.text.close}
			onclick={onClose}
			tabindex="-1"
			type="button"
			transition:fade={{ duration: 150 }}
		></button>

		<div
			class="pointer-events-auto absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-t-3xl bg-primary px-4 pt-3 pb-5 shadow-[0_-10px_34px_rgba(20,30,60,0.16)]"
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

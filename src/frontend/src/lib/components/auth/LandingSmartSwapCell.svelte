<script lang="ts">
	import { onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import SwapProviderAnimation from '$lib/components/swap/SwapProviderAnimation.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SwapProvider } from '$lib/types/swap';

	interface Props {
		gain: string;
	}

	let { gain }: Props = $props();

	const PROVIDERS = [SwapProvider.NEAR_INTENTS, SwapProvider.LIFI, SwapProvider.ONE_SEC];
	const SELECTED = SwapProvider.NEAR_INTENTS;

	// One round each time the cell scrolls into view: it compares for a while, settles on the best
	// offer, then rests. Kept under 5 seconds so nothing loops without a pause control (WCAG 2.2.2).
	const COMPARE_MS = 2600;

	let comparing = $state(false);
	let confirmationId = $state(0);
	let timers: ReturnType<typeof setTimeout>[] = [];

	const clearTimers = () => {
		timers.forEach(clearTimeout);
		timers = [];
	};

	const round = () => {
		comparing = true;
		timers.push(
			setTimeout(() => {
				comparing = false;
				confirmationId++;
			}, COMPARE_MS)
		);
	};

	// A round played off screen would be missed, so each time the cell comes into view starts one.
	const playWhenVisible = (node: HTMLElement) => {
		if (typeof IntersectionObserver === 'undefined') {
			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			clearTimers();

			// Read on every entry, so a motion setting changed while the page is open applies.
			if (entry?.isIntersecting && !prefersReducedMotion.current) {
				round();
				return;
			}

			comparing = false;
		});

		observer.observe(node);

		return () => observer.disconnect();
	};

	onDestroy(clearTimers);

	const [gainBefore, gainAfter = ''] = $derived($i18n.swap.text.smart_swap_gain.split('$amount'));
</script>

<!-- SwapProviderCell's look and comparing state (styles/global/smart-swap.scss), as one scripted
	round: the real cell needs a live swap context. -->
<div
	class="relative flex w-full items-center gap-3 rounded-lg border border-tertiary bg-secondary px-4 py-3 text-left"
	{@attach playWhenVisible}
>
	<span class="smart-beam" class:beaming={comparing} aria-hidden="true"><span></span></span>
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="text-base font-bold text-primary" class:smart-thinking={comparing}
			>{$i18n.swap.text.smart_swap}</span
		>
		<span class="grid pt-0.5 text-sm">
			<span
				class="col-start-1 row-start-1 text-tertiary transition-opacity duration-150 ease-out motion-reduce:transition-none"
				class:opacity-0={!comparing}
				class:smart-thinking={comparing}
			>
				{$i18n.swap.text.finding_best_rate}
			</span>
			<span
				class="col-start-1 row-start-1 text-tertiary transition-opacity duration-150 ease-out motion-reduce:transition-none"
				class:opacity-0={comparing}
				>{gainBefore}+<strong class="font-bold text-primary">{gain}</strong>{gainAfter}</span
			>
		</span>
	</span>
	<span class="flex min-w-24 flex-initial flex-col items-end">
		<SwapProviderAnimation
			animate
			{confirmationId}
			loading={comparing}
			providers={PROVIDERS}
			selectedProvider={SELECTED}
		/>
	</span>
</div>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import SwapProviderAnimation from '$lib/components/swap/SwapProviderAnimation.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SwapProvider } from '$lib/types/swap';
	import { formatCurrency } from '$lib/utils/format.utils';

	// Sample offers for the illustration: the providers OISY asks for a Bitcoin to Ethereum swap.
	const PROVIDERS = [SwapProvider.NEAR_INTENTS, SwapProvider.LIFI, SwapProvider.ONE_SEC];
	const SELECTED = SwapProvider.NEAR_INTENTS;
	const GAIN_USD = 12.4;

	// One round: the cell compares for a while, settles on the best offer, then rests.
	const COMPARE_MS = 2600;
	const ROUND_MS = 7000;

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
			}, COMPARE_MS),
			setTimeout(round, ROUND_MS)
		);
	};

	// Plays only while the cell is on screen, and not at all with reduced motion.
	const playWhenVisible = (node: HTMLElement) => {
		if (prefersReducedMotion.current || typeof IntersectionObserver === 'undefined') {
			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			clearTimers();

			if (entry?.isIntersecting) {
				round();
				return;
			}

			comparing = false;
		});

		observer.observe(node);

		return () => observer.disconnect();
	};

	onDestroy(clearTimers);

	let gainParts = $derived.by(() => {
		const [before, after = ''] = $i18n.swap.text.smart_swap_gain.split('$amount');
		const amount = formatCurrency({
			value: GAIN_USD,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		});

		return { before, amount, after };
	});
</script>

<!-- Mirrors SwapProviderCell (its markup and styles), which needs a live swap context. -->
<div
	class="relative flex w-full items-center gap-3 rounded-lg border border-tertiary bg-secondary px-4 py-3 text-left"
	{@attach playWhenVisible}
>
	<span class="smart-beam" class:beaming={comparing} aria-hidden="true"><span></span></span>
	<span class="flex flex-auto flex-col">
		<span
			class="text-base font-bold whitespace-nowrap text-primary"
			class:smart-thinking={comparing}>{$i18n.swap.text.smart_swap}</span
		>
		<span class="flex w-0 min-w-full pt-0.5 text-sm whitespace-nowrap">
			{#if comparing}
				<span class="smart-thinking truncate text-tertiary"
					>{$i18n.swap.text.finding_best_rate}</span
				>
			{:else if gainParts.amount}
				<span class="truncate text-tertiary"
					>{gainParts.before}<span class="font-semibold text-primary">{gainParts.amount}</span
					>{gainParts.after}</span
				>
			{/if}
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
	<span class="flex shrink-0 text-tertiary" aria-hidden="true">
		<IconChevronRight size="20" />
	</span>
</div>

<style lang="scss">
	// Copied from SwapProviderCell.svelte; keep the two in step.
	.smart-thinking {
		background: linear-gradient(
				90deg,
				var(--color-foreground-tertiary) 0 35%,
				var(--color-foreground-primary) 50%,
				var(--color-foreground-tertiary) 65% 100%
			)
			0 0 / 30rem 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;

		@media (prefers-reduced-motion: no-preference) {
			animation: smart-thinking 2000ms linear infinite;
		}

		@media (prefers-reduced-motion: reduce) {
			background: none;
			color: var(--color-foreground-tertiary);
		}
	}

	@keyframes smart-thinking {
		from {
			background-position: 0 0;
		}
		to {
			background-position: 30rem 0;
		}
	}

	.smart-beam {
		position: absolute;
		inset: -1.5px;
		padding: 1.5px;
		overflow: hidden;
		border-radius: inherit;
		pointer-events: none;
		opacity: 0;
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		transition: opacity 600ms cubic-bezier(0.23, 1, 0.32, 1);

		span {
			position: absolute;
			top: 50%;
			left: 50%;
			width: 200%;
			aspect-ratio: 1;
			translate: -50% -50%;
			background: conic-gradient(
				transparent 0 45%,
				color-mix(in srgb, var(--color-foreground-brand-primary-alt) 30%, transparent) 72%,
				var(--color-foreground-brand-primary) 92%,
				transparent 100%
			);
			animation: smart-beam 3600ms linear infinite paused;
		}

		&.beaming {
			opacity: 1;
			transition-duration: 500ms;
			transition-delay: 120ms;

			span {
				animation-play-state: running;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			span {
				animation: none;
				background: var(--color-border-brand-subtle-20);
			}
		}
	}

	@keyframes smart-beam {
		to {
			rotate: 1turn;
		}
	}
</style>

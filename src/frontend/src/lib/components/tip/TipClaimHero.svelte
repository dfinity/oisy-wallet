<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import tipWelcomeImg from '$lib/assets/tip-welcome-img.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		logo?: string;
		symbol?: string;
	}

	let { logo, symbol }: Props = $props();

	/**
	 * The two coin marks Figma composites onto the drawn stack, as fractions of
	 * the artwork rather than pixels — the illustration is fluid down to 390px,
	 * and a badge pinned in pixels would drift off its coin on the way there.
	 *
	 * Measured against the *stack* rather than the frame. The design draws these
	 * per token inside a tighter crop than the exported asset, so copying its
	 * frame percentages left both marks floating clear of the coins; what carries
	 * over is where they sit relative to the drawing.
	 *
	 * Widths are clamped because the badge carries a real token logo: below ~28px
	 * a token mark is an unreadable smudge, and past ~54px it starts competing
	 * with the amount in the headline.
	 */
	const BADGES = [
		{ left: '30.5%', top: '50.9%', width: 'clamp(28px, 7.7%, 44px)', primary: false },
		{ left: '71.6%', top: '64.2%', width: 'clamp(34px, 10.4%, 54px)', primary: true }
	];

	let hasLogo = $derived(nonNullish(logo) && notEmptyString(logo));

	// The symbol is spelled out when a ledger publishes no `icrc1:logo` (the plain
	// ICP ledger is one), because a blank badge on a coin reads as a failed image.
	// Only on the larger mark, though: a six-character symbol clips inside the
	// smaller one, and one clean label reads deliberate where two clipped ones
	// read broken.
	let hasSymbol = $derived(nonNullish(symbol) && notEmptyString(symbol));
</script>

<div class="relative mb-6 w-full" aria-label={$i18n.tip.alt.claim_illustration} role="img">
	<Img alt="" src={tipWelcomeImg} styleClass="h-auto w-full rounded-xl" />

	{#if hasLogo || hasSymbol}
		{#each BADGES as { left, top, width, primary } (left)}
			{#if hasLogo || primary}
				<span
					style={`left: ${left}; top: ${top}; width: ${width};`}
					class="absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-white shadow-md"
				>
					{#if nonNullish(logo) && notEmptyString(logo)}
						<Img alt="" src={logo} styleClass="h-full w-full rounded-full object-contain" />
					{:else}
						<span class="truncate px-[8%] text-[0.5rem] font-bold text-brand-primary">{symbol}</span
						>
					{/if}
				</span>
			{/if}
		{/each}
	{/if}
</div>

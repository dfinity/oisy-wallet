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
	 * Where Figma sits the two coin marks on the drawn stack, as fractions of the
	 * artwork rather than pixels — the illustration is fluid down to 390px, and a
	 * badge pinned in pixels would drift off its coin on the way there.
	 *
	 * The width is clamped because the badge carries a real token logo: below
	 * ~28px a token mark is an unreadable smudge, and above ~56px it starts to
	 * compete with the amount in the headline.
	 */
	const BADGES = [
		{ left: '29.7%', top: '41.8%', width: 'clamp(28px, 8.2%, 46px)' },
		{ left: '73.5%', top: '55.7%', width: 'clamp(34px, 11.1%, 56px)' }
	];

	let hasLogo = $derived(nonNullish(logo) && notEmptyString(logo));

	// The symbol is spelled out when a ledger publishes no `icrc1:logo` (the plain
	// ICP ledger is one), because a blank badge on a coin reads as a failed image.
	let hasSymbol = $derived(nonNullish(symbol) && notEmptyString(symbol));
</script>

<div class="relative mb-6 w-full" aria-label={$i18n.tip.alt.claim_illustration} role="img">
	<Img alt="" src={tipWelcomeImg} styleClass="h-auto w-full rounded-xl" />

	{#if hasLogo || hasSymbol}
		{#each BADGES as { left, top, width } (left)}
			<span
				style={`left: ${left}; top: ${top}; width: ${width};`}
				class="absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-white shadow-md"
			>
				{#if nonNullish(logo) && notEmptyString(logo)}
					<Img alt="" src={logo} styleClass="h-full w-full rounded-full object-contain" />
				{:else}
					<span class="truncate px-[8%] text-[0.5rem] font-bold text-brand-primary">{symbol}</span>
				{/if}
			</span>
		{/each}
	{/if}
</div>

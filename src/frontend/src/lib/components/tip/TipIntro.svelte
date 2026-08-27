<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import tipIntroImg from '$lib/assets/tip-intro-img.webp';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		TIP_INTRO_GET_STARTED_BUTTON,
		TIP_INTRO_HISTORY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { tipsOverview } from '$lib/derived/tips.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		onGetStarted: () => void;
		onViewHistory: () => void;
	}

	let { onGetStarted, onViewHistory }: Props = $props();

	// Omitted rather than shown as "$0.00" when nothing could be priced: a zero
	// there would read as "these tips are worth nothing" instead of "we do not
	// have a rate".
	const fiat = (value: number): string | undefined =>
		value > 0
			? formatCurrency({
					value,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined;

	let openFiat = $derived(fiat($tipsOverview.openUsd));
	let claimedFiat = $derived(fiat($tipsOverview.claimedUsd));
</script>

<ContentWithToolbar>
	<!--
		Status first, above the artwork. The illustration is for someone who has
		never sent a tip; anybody who has is here to find out whether one of them is
		stuck, and making them scroll past a picture to learn that is the wrong way
		round. Absent entirely for a first-time sender, so the screen they see is
		unchanged.

		Everything shown comes from the `get_my_tips` the app already made on
		sign-in, so this costs no extra call.
	-->
	{#if $tipsOverview.hasAny}
		<div class="mb-6 rounded-xl bg-secondary px-4 py-3">
			<span class="text-xs font-bold tracking-wider text-tertiary uppercase">
				{$i18n.tip.text.overview_window}
			</span>

			{#if $tipsOverview.failed > 0}
				<!--
					A button, because it is the one row with something to do about it, and
					History now opens with the failed tips at the top.
				-->
				<button
					class="mt-2 flex w-full items-center justify-between gap-2 text-left"
					onclick={onViewHistory}
					type="button"
				>
					<span class="text-sm font-bold text-warning-primary"
						>{$i18n.tip.text.overview_failed}</span
					>

					<span class="text-sm font-bold text-warning-primary">{$tipsOverview.failed}</span>
				</button>

				<p class="m-0 mt-1 text-xs text-tertiary">{$i18n.tip.text.overview_failed_hint}</p>
			{/if}

			<div class="mt-2 flex items-center justify-between gap-2 text-sm">
				<span class="text-tertiary">{$i18n.tip.text.overview_open}</span>

				<span>
					{$tipsOverview.open}{#if nonNullish(openFiat)}<span class="text-tertiary">
							&middot; {openFiat}</span
						>{/if}
				</span>
			</div>

			<div class="mt-1 flex items-center justify-between gap-2 text-sm">
				<span class="text-tertiary">{$i18n.tip.text.overview_claimed}</span>

				<span>
					{$tipsOverview.claimed}{#if nonNullish(claimedFiat)}<span class="text-tertiary">
							&middot; {claimedFiat}</span
						>{/if}
				</span>
			</div>
		</div>
	{/if}

	<!--
		No aspect box and no tinted ground: the artwork is the drawn panel, at its
		own 1024x480, and letting it size itself keeps that ratio exactly rather
		than cropping it to whichever one we would have hard-coded here.
	-->
	<Img
		alt={$i18n.tip.alt.intro_illustration}
		role="img"
		src={tipIntroImg}
		styleClass="mb-6 h-auto w-full rounded-xl"
	/>

	<h3 class="mb-3">{$i18n.tip.text.intro_heading}</h3>

	<p class="mb-4 text-tertiary">{$i18n.tip.text.intro_body}</p>

	<div class="mb-4">
		<ExternalLink
			ariaLabel={$i18n.tip.text.learn_how_it_works}
			href={OISY_DOCS_URL}
			iconVisible={true}
		>
			{$i18n.tip.text.learn_how_it_works}
		</ExternalLink>
	</div>

	{#snippet toolbar()}
		<div class="flex gap-3">
			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={onViewHistory}
				testId={TIP_INTRO_HISTORY_BUTTON}
			>
				{$i18n.tip.text.view_history}
			</Button>

			<Button fullWidth onclick={onGetStarted} testId={TIP_INTRO_GET_STARTED_BUTTON}>
				{$i18n.tip.text.get_started}

				<IconArrowRight />
			</Button>
		</div>
	{/snippet}
</ContentWithToolbar>

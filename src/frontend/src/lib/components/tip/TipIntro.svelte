<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import tipIntroImg from '$lib/assets/tip-intro-img.webp';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
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

	<!--
		Below the heading rather than above the artwork, and on the surface rather
		than a tinted card: it is part of this screen's content, not a banner bolted
		on top of it.

		Two columns, because the two figures are peers and reading them side by side
		is one glance instead of two. Absent entirely unless one of the three groups
		has something in it — a first-time sender, a still-loading store and a sender
		whose tips have all lapsed all see the screen unchanged.

		Everything shown comes from the `get_my_tips` the app already made on
		sign-in, so this costs no extra call.
	-->
	{#if $tipsOverview.hasAny}
		<div class="mb-4 rounded-xl border border-secondary px-4 py-3">
			<span class="text-xs font-bold tracking-wider text-tertiary uppercase">
				{$i18n.tip.text.overview_window}
			</span>

			{#if $tipsOverview.failed > 0}
				<!--
					Full width and above the pair: it is the only row with something to do
					about it, and History now opens with the failed tips at the top. Tinted
					and iconed rather than set in orange type like the counts below it,
					because at a glance the shape of the row is what separates "this one
					wants you" from two figures that are merely information.
				-->
				<button
					class="mt-2 flex w-full items-start gap-2 rounded-lg border border-warning-solid bg-warning-subtle-10 px-3 py-2 text-left"
					onclick={onViewHistory}
					type="button"
				>
					<span class="shrink-0 text-warning-primary">
						<IconAlertTriangle size="18" />
					</span>

					<span class="flex-1">
						<span class="block text-sm font-bold text-warning-primary">
							{$i18n.tip.text.overview_failed}
						</span>

						<span class="block text-xs text-secondary">
							{$i18n.tip.text.overview_failed_hint}
						</span>
					</span>

					<span class="shrink-0 text-sm font-bold text-warning-primary">
						{$tipsOverview.failed}
					</span>
				</button>
			{/if}

			<!--
				Figure first, label beside it: the count is what the sender came to see, and
				keeping the fiat under the label answers "how much is that" without spending
				a second row on it. A rule between the columns rather than a gap, because
				the two are peers being compared, not two unrelated blocks.
			-->
			<div class="mt-3 grid grid-cols-2">
				<div class="flex items-center gap-2 pr-3">
					<span class="text-2xl font-bold">{$tipsOverview.open}</span>

					<span class="min-w-0">
						<span class="block text-xs text-tertiary">{$i18n.tip.text.overview_open}</span>

						{#if nonNullish(openFiat)}
							<span class="block text-xs font-semibold">{openFiat}</span>
						{/if}
					</span>
				</div>

				<div class="flex items-center gap-2 border-l border-secondary pl-3">
					<span class="text-2xl font-bold">{$tipsOverview.claimed}</span>

					<span class="min-w-0">
						<span class="block text-xs text-tertiary">{$i18n.tip.text.overview_claimed}</span>

						{#if nonNullish(claimedFiat)}
							<span class="block text-xs font-semibold">{claimedFiat}</span>
						{/if}
					</span>
				</div>
			</div>
		</div>
	{/if}

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

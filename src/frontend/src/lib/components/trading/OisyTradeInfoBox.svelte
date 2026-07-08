<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import IconNetworks from '$lib/components/icons/lucide/IconNetworks.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import FactBox from '$lib/components/ui/FactBox.svelte';
	import { OISY_TRADE_LEARN_MORE_URL } from '$lib/constants/oisy-trade.constants';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	// Optional trailing content (e.g. a "Go to Trade" button) rendered as the last
	// element inside the box — used by the Assets Trading tab onboarding placeholder.
	// The Trade page doesn't pass it, so the box there is unchanged.
	interface Props {
		footer?: Snippet;
	}

	let { footer }: Props = $props();
</script>

<!-- Scroll target for the hero "Learn more" link (see OisyTradeProviderHero). -->
<div id="oisy-trade-info">
	<StakeContentSection>
		{#snippet title()}
			<div class="flex w-full items-center gap-3 border-b border-secondary pb-4">
				<OisyTradeMark size="42" />

				<h4 class="flex flex-1">{$i18n.trading.info.title}</h4>

				<ExternalLink
					ariaLabel={$i18n.trading.text.learn_more}
					href={OISY_TRADE_LEARN_MORE_URL}
					iconAsLast
					iconSize="15"
					styleClass="text-sm"
					trackEvent={buildLearnMoreEvent({
						sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.OISY_TRADE,
						labelKey: 'trading.text.learn_more',
						url: OISY_TRADE_LEARN_MORE_URL
					})}
				>
					{$i18n.trading.text.learn_more}
				</ExternalLink>
			</div>
		{/snippet}

		{#snippet content()}
			<!-- Flex `order` reorders the three items responsively: on mobile the
			     footer button sits between the text and the fact boxes; on desktop
			     it drops to the end (last element in the box). -->
			<p class="order-1 mt-4 text-sm text-secondary">{$i18n.trading.info.description}</p>

			<div
				class="order-3 mt-6 grid w-full grid-cols-1 gap-3 text-center text-sm md:order-2 md:grid-cols-3"
			>
				<FactBox>
					{#snippet icon()}
						<span class="rounded-full bg-brand-subtle-20 p-4 text-primary">
							<IconCoins size="24" />
						</span>
					{/snippet}

					{#snippet title()}
						{$i18n.trading.info.fact_1_title}
					{/snippet}

					{#snippet description()}
						{$i18n.trading.info.fact_1_description}
					{/snippet}
				</FactBox>

				<FactBox>
					{#snippet icon()}
						<span class="rounded-full bg-brand-subtle-20 p-4 text-primary">
							<IconClock size="24" />
						</span>
					{/snippet}

					{#snippet title()}
						{$i18n.trading.info.fact_2_title}
					{/snippet}

					{#snippet description()}
						{$i18n.trading.info.fact_2_description}
					{/snippet}
				</FactBox>

				<FactBox>
					{#snippet icon()}
						<span class="rounded-full bg-brand-subtle-20 p-4 text-primary">
							<IconNetworks size="24" />
						</span>
					{/snippet}

					{#snippet title()}
						{$i18n.trading.info.fact_3_title}
					{/snippet}

					{#snippet description()}
						{$i18n.trading.info.fact_3_description}
					{/snippet}
				</FactBox>
			</div>

			{#if nonNullish(footer)}
				<div class="order-2 my-4 flex w-full justify-center md:order-3">
					{@render footer()}
				</div>
			{/if}
		{/snippet}
	</StakeContentSection>
</div>

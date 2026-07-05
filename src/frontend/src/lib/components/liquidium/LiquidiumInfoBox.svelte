<script lang="ts">
	import IconLayers from '$lib/components/icons/lucide/IconLayers.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import FactBox from '$lib/components/ui/FactBox.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';

	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="flex w-full items-center gap-3 border-b border-secondary pb-4">
			<Logo size="md" src={liquidium.logo} />

			<h4 class="flex flex-1">{$i18n.liquidium.info.title}</h4>

			<ExternalLink
				ariaLabel={liquidium.name}
				href={liquidium.url}
				iconAsLast
				iconSize="15"
				styleClass="text-sm"
			>
				{$i18n.stake.text.visit_provider}
			</ExternalLink>
		</div>
	{/snippet}

	{#snippet content()}
		<p class="mt-4 text-sm text-secondary">
			{$i18n.liquidium.info.description}
			<ExternalLink
				ariaLabel={$i18n.core.text.learn_more}
				href={liquidium.docsUrl}
				iconAsLast
				styleClass="ml-1"
				trackEvent={buildLearnMoreEvent({
					sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.LIQUIDIUM,
					labelKey: 'core.text.learn_more',
					url: liquidium.docsUrl
				})}
			>
				{$i18n.core.text.learn_more}
			</ExternalLink>
		</p>

		<div class="mt-6 grid w-full grid-cols-1 gap-3 text-center text-sm md:grid-cols-3">
			<FactBox>
				{#snippet icon()}
					<span class="rounded-full bg-warning-subtle-20 p-4 text-primary">
						<IconLineChart size="24" />
					</span>
				{/snippet}

				{#snippet title()}
					{$i18n.liquidium.info.fact_1_title}
				{/snippet}

				{#snippet description()}
					{$i18n.liquidium.info.fact_1_description}
				{/snippet}
			</FactBox>

			<FactBox>
				{#snippet icon()}
					<span class="rounded-full bg-warning-subtle-20 p-4 text-primary">
						<IconShieldCheck size="24" />
					</span>
				{/snippet}

				{#snippet title()}
					{$i18n.liquidium.info.fact_2_title}
				{/snippet}

				{#snippet description()}
					{$i18n.liquidium.info.fact_2_description}
				{/snippet}
			</FactBox>

			<FactBox>
				{#snippet icon()}
					<span class="rounded-full bg-warning-subtle-20 p-4 text-primary">
						<IconLayers size="24" />
					</span>
				{/snippet}

				{#snippet title()}
					{$i18n.liquidium.info.fact_3_title}
				{/snippet}

				{#snippet description()}
					{$i18n.liquidium.info.fact_3_description}
				{/snippet}
			</FactBox>
		</div>
	{/snippet}
</StakeContentSection>

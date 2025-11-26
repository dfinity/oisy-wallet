<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import IconContainer from '$lib/components/icons/IconContainer.svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import FactBox from '$lib/components/ui/FactBox.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { STAKE_PROVIDER_EXTERNAL_URL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { StakeProvider } from '$lib/types/stake';
	import { formatStakeApyNumber } from '$lib/utils/format.utils.js';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="flex w-full items-center gap-3 border-b border-secondary pb-4">
			<Logo size="md" src={stakeProvidersConfig[StakeProvider.GLDT].logo} />
			<h3 class="flex flex-1">{$i18n.stake.info.gldt.title}</h3>
			<ExternalLink
				ariaLabel={stakeProvidersConfig[StakeProvider.GLDT].name}
				href={stakeProvidersConfig[StakeProvider.GLDT].url}
				iconAsLast
				iconSize="15"
				styleClass="text-sm"
				testId={STAKE_PROVIDER_EXTERNAL_URL}
			>
				{$i18n.stake.text.visit_provider}
			</ExternalLink>
		</div>
	{/snippet}
	{#snippet content()}
		<p class="mt-4 text-sm text-secondary">{$i18n.stake.info.gldt.description}</p>

		<div class="mt-6 grid w-full grid-cols-1 gap-3 text-center text-sm md:grid-cols-3">
			<FactBox>
				{#snippet icon()}
					<span
						class="rounded-full bg-gradient-to-r from-gold-0 to-gold-100 p-4 text-primary-inverted"
					>
						<IconContainer size="24" />
					</span>
				{/snippet}
				{#snippet title()}
					{$i18n.stake.info.gldt.fact_1_title}
				{/snippet}
				{#snippet description()}
					{$i18n.stake.info.gldt.fact_1_description}
				{/snippet}
			</FactBox>
			<FactBox>
				{#snippet icon()}
					<span
						class="rounded-full bg-gradient-to-r from-gold-0 to-gold-100 p-4 text-primary-inverted"
					>
						<IconClock size="24" />
					</span>
				{/snippet}
				{#snippet title()}
					{$i18n.stake.info.gldt.fact_2_title}
				{/snippet}
				{#snippet description()}{$i18n.stake.info.gldt.fact_2_description}
				{/snippet}
			</FactBox>
			<FactBox>
				{#snippet icon()}
					<span
						class="rounded-full bg-gradient-to-r from-gold-0 to-gold-100 p-4 text-primary-inverted"
					>
						<IconLineChart size="24" />
					</span>
				{/snippet}
				{#snippet title()}
					{$i18n.stake.info.gldt.fact_3_title}
				{/snippet}
				{#snippet description()}
					{nonNullish($gldtStakeStore?.apy)
						? replacePlaceholders($i18n.stake.info.gldt.fact_3_description, {
								$apy: `${formatStakeApyNumber($gldtStakeStore.apy)}`
							})
						: $i18n.stake.info.gldt.fact_3_description_fallback}
				{/snippet}
			</FactBox>
		</div>
	{/snippet}
</StakeContentSection>

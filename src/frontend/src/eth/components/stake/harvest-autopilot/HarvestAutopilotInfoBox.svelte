<script lang="ts">
	import IconContainer from '$lib/components/icons/IconContainer.svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import FactBox from '$lib/components/ui/FactBox.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { i18n } from '$lib/stores/i18n.store';
	import { StakeProvider } from '$lib/types/stake';
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="border-secondary flex w-full items-center gap-3 border-b pb-4">
			<Logo size="md" src={stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].logo} />

			<h4 class="flex flex-1">{$i18n.stake.info.harvest_autopilot.title}</h4>

			<ExternalLink
				ariaLabel={stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].name}
				href={stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].url}
				iconAsLast
				iconSize="15"
				styleClass="text-sm"
			>
				{$i18n.stake.text.visit_provider}
			</ExternalLink>
		</div>
	{/snippet}

	{#snippet content()}
		<p class="text-secondary mt-4 text-sm">{$i18n.stake.info.harvest_autopilot.description}</p>

		<div class="mt-6 grid w-full grid-cols-1 gap-3 text-center text-sm md:grid-cols-3">
			<FactBox>
				{#snippet icon()}
					<span class="bg-warning-subtle-20 text-primary rounded-full p-4">
						<IconContainer size="24" />
					</span>
				{/snippet}

				{#snippet title()}
					{$i18n.stake.info.harvest_autopilot.fact_1_title}
				{/snippet}

				{#snippet description()}
					{$i18n.stake.info.harvest_autopilot.fact_1_description}
				{/snippet}
			</FactBox>

			<FactBox>
				{#snippet icon()}
					<span class="bg-warning-subtle-20 text-primary rounded-full p-4">
						<IconClock size="24" />
					</span>
				{/snippet}

				{#snippet title()}
					{$i18n.stake.info.harvest_autopilot.fact_2_title}
				{/snippet}

				{#snippet description()}
					{$i18n.stake.info.harvest_autopilot.fact_2_description}
				{/snippet}
			</FactBox>

			<FactBox>
				{#snippet icon()}
					<span class="bg-warning-subtle-20 text-primary rounded-full p-4">
						<IconLineChart size="24" />
					</span>
				{/snippet}

				{#snippet title()}
					{$i18n.stake.info.harvest_autopilot.fact_3_title}
				{/snippet}

				{#snippet description()}
					{$i18n.stake.info.harvest_autopilot.fact_3_description}
				{/snippet}
			</FactBox>
		</div>
	{/snippet}
</StakeContentSection>

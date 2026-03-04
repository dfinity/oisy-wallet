<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import { EARNING_ENABLED } from '$env/earning';
	import { EarningCardFields } from '$env/types/env.earning-cards';
	import HarvestAutopilotInfoBox from '$eth/components/stake/harvest-autopilot/HarvestAutopilotInfoBox.svelte';
	import { harvestAutopilots } from '$eth/derived/harvest-autopilots.derived';
	import EarningPositionCard from '$lib/components/earning/EarningPositionCard.svelte';
	import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import VaultCard from '$lib/components/vaults/VaultCard.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { AppPath } from '$lib/constants/routes.constants';
	import { earningData } from '$lib/derived/earning.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { StakeProvider } from '$lib/types/stake';
	import type { Vault } from '$lib/types/vaults';
	import { networkUrl } from '$lib/utils/nav.utils';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let data = $derived($earningData['harvest-autopilot']);

	let infoBoxRef = $state<HTMLElement | undefined>();

	let [currentPositions, otherAutopilots] = $derived(
		$harvestAutopilots.reduce<[Vault[], Vault[]]>(
			([currentPositionsAcc, otherAutopilotsAcc], autopilot) =>
				nonNullish(autopilot.token.usdBalance) && autopilot.token.usdBalance > 0
					? [[...currentPositionsAcc, autopilot], otherAutopilotsAcc]
					: [currentPositionsAcc, [...otherAutopilotsAcc, autopilot]],
			[[], []]
		)
	);

	let currentPositionsSorted = $derived(
		currentPositions.sort((a, b) => (b.token.usdBalance ?? 0) - (a.token.usdBalance ?? 0))
	);

	let otherAutopilotsSorted = $derived(
		otherAutopilots.sort((a, b) => (a.token.name ?? '').localeCompare(b.token.name ?? ''))
	);
</script>

<div class="flex flex-col gap-6 pb-6">
	<StakeProviderContainer
		logo={stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].logo}
		maxApy={Number(data[EarningCardFields.APY])}
		pageDescription={$i18n.stake.text.harvest_autopilot_page_description}
		pageTitle={$i18n.earning.cards.harvest_autopilot.title}
	>
		{#snippet backButton()}
			{#if EARNING_ENABLED}
				<ButtonIcon
					ariaLabel="icon"
					colorStyle="tertiary"
					link={false}
					onclick={() =>
						goto(
							networkUrl({
								path: AppPath.Earn,
								networkId: $networkId,
								usePreviousRoute: true,
								fromRoute
							})
						)}
				>
					{#snippet icon()}
						<IconBackArrow />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}

		{#snippet content()}
			<Button
				innerStyleClass="items-center"
				link
				onclick={() => infoBoxRef?.scrollIntoView({ behavior: 'smooth' })}
				styleClass="text-sm"
			>
				<span>{$i18n.core.text.learn_more}</span>
				<IconArrowDown size="18" />
			</Button>

			<div class="mt-6 flex w-full flex-col gap-3 sm:flex-row">
				<EarningPotentialCard
					highestEarningPotentialUsd={Number(data[EarningCardFields.EARNING_POTENTIAL])}
				/>
				<EarningPositionCard
					earningPositionsUsd={Number(data[EarningCardFields.CURRENT_EARNING])}
					earningYearlyAmountUsd={Number(data[EarningCardFields.CURRENT_STAKED])}
				/>
			</div>
		{/snippet}
	</StakeProviderContainer>

	{#if currentPositionsSorted.length > 0}
		<StakeContentSection>
			{#snippet title()}
				<h4>{$i18n.stake.text.my_positions}</h4>
			{/snippet}

			{#snippet content()}
				<div class="flex w-full flex-col gap-4">
					{#each currentPositionsSorted as autopilot (autopilot.token.id)}
						<VaultCard
							data={autopilot}
							onClick={() => goto(`${AppPath.EarnAutopilot}?vault=${autopilot.token.address}`)}
						/>
					{/each}
				</div>
			{/snippet}
		</StakeContentSection>
	{/if}

	{#if otherAutopilotsSorted.length > 0}
		<StakeContentSection>
			{#snippet title()}
				<h4>{$i18n.stake.text.available_autopilots}</h4>
			{/snippet}

			{#snippet content()}
				<div class="flex w-full flex-col gap-4">
					{#each otherAutopilotsSorted as autopilot (autopilot.token.id)}
						<VaultCard
							data={autopilot}
							onClick={() => goto(`${AppPath.EarnAutopilot}?vault=${autopilot.token.address}`)}
						/>
					{/each}
				</div>
			{/snippet}
		</StakeContentSection>
	{/if}

	<div bind:this={infoBoxRef}>
		<HarvestAutopilotInfoBox />
	</div>
</div>

<script lang="ts">
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { earningCards } from '$env/earning-cards.env';
	import { EarningCardFields } from '$env/types/env.earning-cards';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import { getContext } from 'svelte';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { normalizeNetworkMultiplier } from '$lib/utils/rewards.utils';
	import { NETWORK_BONUS_MULTIPLIER_DEFAULT, ZERO } from '$lib/constants/app.constants';
	import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import { nonNullish } from '@dfinity/utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { goto } from '$app/navigation';
	import IconCalendarDays from '$lib/components/icons/lucide/IconCalendarDays.svelte';
	import { formatToShortDateString } from '$lib/utils/format.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
	import { enabledFungibleTokensUi } from '$lib/derived/tokens.derived';
	import { calculateTokenUsdAmount } from '$lib/utils/token.utils';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import { formatToken } from '$lib/utils/format.utils.js';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const LATEST_REWARDS_CAMPAIGN = 'sprinkles_s1e5';

	let totalUsdBalance = $derived(sumTokensUiUsdBalance($enabledFungibleTokensUi));

	let gldtToken = $derived($enabledFungibleTokensUi.find(isGLDTToken));

	const cardsData: Record<
		string,
		{ [key in EarningCardFields]?: string | number } & { action: () => Promise<void> }
	> = $derived({
		[LATEST_REWARDS_CAMPAIGN]: {
			action: () => goto(AppPath.EarningRewards)
		},
		'gldt-staking': {
			[EarningCardFields.APY]: nonNullish($gldtStakeStore?.apy) ? `${$gldtStakeStore.apy}%` : '-',
			[EarningCardFields.CURRENT_STAKED]: nonNullish(gldtToken)
				? `${formatToken({
						value: $gldtStakeStore?.position?.staked ?? ZERO,
						unitName: gldtToken.decimals
					})} ${gldtToken.symbol}`
				: '-',
			[EarningCardFields.EARNING_POTENTIAL]: (totalUsdBalance * ($gldtStakeStore?.apy ?? 0)) / 100,
			[EarningCardFields.CURRENT_EARNING]: nonNullish(gldtToken)
				? calculateTokenUsdAmount({
						amount: $gldtStakeStore?.position?.staked,
						token: gldtToken,
						$exchanges
					})
				: undefined,
			[EarningCardFields.TERMS]: $i18n.earning.terms.flexible,
			action: () => goto(AppPath.EarningGold)
		}
	});

	$effect(() => {
		console.log(cardsData);
	});

	const { getCampaignEligibility } = getContext<RewardEligibilityContext>(
		REWARD_ELIGIBILITY_CONTEXT_KEY
	);

	const currentReward = $derived(rewardCampaigns.find((r) => r.id === LATEST_REWARDS_CAMPAIGN));
	const campaignEligibility = $derived(
		currentReward ? getCampaignEligibility(currentReward.id) : undefined
	);
	const isEligible = $derived($campaignEligibility?.eligible ?? false);
	const hasNetworkBonus = $derived($campaignEligibility?.probabilityMultiplierEnabled ?? false);
	const networkBonusMultiplier = $derived(
		normalizeNetworkMultiplier(
			$campaignEligibility?.probabilityMultiplier ?? NETWORK_BONUS_MULTIPLIER_DEFAULT
		)
	);
	const criteria = $derived($campaignEligibility?.criteria ?? []);
</script>

<div class="flex flex-col">
	<StakeContentSection>
		{#snippet title()}
			Earning opportunities
		{/snippet}
		{#snippet content()}
			<div class="flex grid grid-cols-2 gap-3 md:flex-row">
				{#each earningCards as card}
					<EarningOpportunityCard>
						{#snippet logo()}
							<Logo src={card.logo} size="lg" />
						{/snippet}
						{#snippet badge()}
							{#if nonNullish(currentReward) && card.id === currentReward.id}
								<span class="mr-2"><IconCalendarDays size="14" /></span>
								{$i18n.rewards.text.active_date}
								{formatToShortDateString({ date: currentReward.endDate, i18n: $i18n }) +
									' ' +
									currentReward.endDate.getDate()}
							{:else}
								Current APY <span class="ml-1 font-bold text-success-primary"
									>{cardsData[card.id].apy}</span
								>
							{/if}
						{/snippet}
						{#snippet title()}
							{resolveText({ i18n: $i18n, path: card.title })}
						{/snippet}
						{#snippet description()}
							<p>{resolveText({ i18n: $i18n, path: card.description })}</p>

							{#if nonNullish(currentReward) && card.id === currentReward.id}
								<RewardsRequirements
									{criteria}
									{hasNetworkBonus}
									{isEligible}
									{networkBonusMultiplier}
									reward={currentReward}
									type="earnings-card"
								/>
							{:else}
								<List condensed itemStyleClass="flex-col md:flex-row">
									{#each card.fields as cardField}
										<ListItem>
											<span class="text-tertiary"
												>{resolveText({
													i18n: $i18n,
													path: `earning.card_fields.${cardField}`
												})}</span
											>
											<span class="font-bold">
												{#if cardField === EarningCardFields.CURRENT_EARNING || cardField === EarningCardFields.EARNING_POTENTIAL}
													{#if Number(cardsData[card.id][cardField]) > 0}
														<EarningYearlyAmount
															value={Number(cardsData[card.id][cardField])}
															formatPositiveAmount={cardField === EarningCardFields.CURRENT_EARNING}
															showPlusSign
														/>
													{:else}
														-
													{/if}
												{:else}
													{nonNullish(cardsData[card.id][cardField])
														? resolveText({
																i18n: $i18n,
																path: `${cardsData[card.id][cardField]}`
															})
														: '-'}
												{/if}
											</span>
										</ListItem>
									{/each}
								</List>
							{/if}
						{/snippet}
						{#snippet button()}
							<Button
								onclick={cardsData[card.id].action}
								colorStyle={card.id === currentReward?.id ? 'primary' : 'success'}
								fullWidth
								paddingSmall>{resolveText({ i18n: $i18n, path: card.actionText })}</Button
							>
						{/snippet}
					</EarningOpportunityCard>
				{/each}
			</div>
		{/snippet}
	</StakeContentSection>
</div>

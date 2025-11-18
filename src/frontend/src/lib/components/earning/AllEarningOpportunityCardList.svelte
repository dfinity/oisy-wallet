<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { earningCards } from '$env/earning-cards.env';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import { EarningCardFields } from '$env/types/env.earning-cards';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import DefaultEarningOpportunityCard from '$lib/components/earning/DefaultEarningOpportunityCard.svelte';
	import RewardsEarningOpportunityCard from '$lib/components/earning/RewardsEarningOpportunityCard.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		enabledFungibleTokensUi,
		enabledMainnetFungibleTokensUsdBalance
	} from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';
	import { calculateTokenUsdAmount } from '$lib/utils/token.utils';

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const currentReward = $derived(rewardCampaigns[rewardCampaigns.length - 1]);

	let gldtToken = $derived($enabledFungibleTokensUi.find(isGLDTToken));

	const cardsData: Record<
		string,
		{ [key in EarningCardFields]?: string | number } & { action: () => Promise<void> }
	> = $derived({
		'gldt-staking': {
			[EarningCardFields.APY]: nonNullish($gldtStakeStore?.apy)
				? `${formatStakeApyNumber($gldtStakeStore.apy)}%`
				: '-',
			[EarningCardFields.CURRENT_STAKED]: nonNullish(gldtToken)
				? `${formatToken({
						value: $gldtStakeStore?.position?.staked ?? ZERO,
						unitName: gldtToken.decimals
					})} ${gldtToken.symbol}`
				: '-',
			[EarningCardFields.EARNING_POTENTIAL]: nonNullish($gldtStakeStore?.apy)
				? ($enabledMainnetFungibleTokensUsdBalance * $gldtStakeStore.apy) / 100
				: undefined,
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
</script>

<div class="mt-5 flex grid grid-cols-2 gap-3 md:flex-row">
	{#each earningCards as card, i (`${card.id}-${i}`)}
		{#if card.id === currentReward.id}
			<RewardsEarningOpportunityCard />
		{:else}
			<DefaultEarningOpportunityCard cardData={card} cardFields={cardsData[card.id]} />
		{/if}
	{/each}
</div>

<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import EligibilityBadge from '$lib/components/rewards/EligibilityBadge.svelte';
	import NetworkBonusImage from '$lib/components/rewards/NetworkBonusImage.svelte';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_BANNER, REWARDS_STATUS_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { isEndedCampaign, normalizeNetworkMultiplier } from '$lib/utils/rewards.utils';
	import { NETWORK_BONUS_MULTIPLIER_DEFAULT } from '$lib/constants/app.constants';

	interface Props {
		onclick: () => void;
		reward: RewardCampaignDescription;
		testId?: string;
	}

	let { onclick, reward, testId }: Props = $props();

	const { getCampaignEligibility } = getContext<RewardEligibilityContext>(
		REWARD_ELIGIBILITY_CONTEXT_KEY
	);

	const campaignEligibility = getCampaignEligibility(reward.id);
	const isEligible = $derived($campaignEligibility?.eligible ?? false);
	const hasNetworkBonus = $derived($campaignEligibility?.probabilityMultiplierEnabled ?? false);
	const networkBonusMultiplier = $derived(
		normalizeNetworkMultiplier($campaignEligibility?.probabilityMultiplier ?? NETWORK_BONUS_MULTIPLIER_DEFAULT)
	);
	const hasEnded = $derived(isEndedCampaign(reward.endDate));
</script>

<button class="flex flex-col" data-tid={testId} {onclick}>
	<div class="-mb-7">
		<div class="max-h-66 relative overflow-hidden rounded-2xl">
			<Img
				alt={replacePlaceholders($i18n.rewards.alt.reward_banner, {
					$campaignName: resolveText({ i18n: $i18n, path: reward.cardTitle })
				})}
				grayscale={hasEnded}
				src={reward.cardBanner}
				testId={REWARDS_BANNER}
			/>

			<span class="absolute right-4 top-4">
				<RewardDateBadge
					date={reward.endDate}
					testId={nonNullish(testId) ? `${testId}-date-badge` : undefined}
				/>
			</span>
		</div>
	</div>

	<div class="relative rounded-lg bg-primary p-4">
		<article class="h-full">
			<section>
				<div
					class="flex gap-3 text-start text-lg font-semibold"
					class:flex-col-reverse={hasNetworkBonus}
				>
					{resolveText({ i18n: $i18n, path: reward.cardTitle })}

					<div class="flex flex-wrap items-center gap-3">
						{#if !hasEnded}
							<EligibilityBadge {isEligible} {testId} />
						{/if}

						{#if hasNetworkBonus && nonNullish(networkBonusMultiplier)}
							<NetworkBonusImage disabled={!isEligible} multiplier={networkBonusMultiplier} />
						{/if}
					</div>
				</div>

				<p class="m-0 mt-2 text-start text-xs text-tertiary">
					<Html text={resolveText({ i18n: $i18n, path: reward.oneLiner })} />
				</p>
			</section>
			<section class="bottom-4 left-4 mt-3 flex">
				<div
					class="rounded-xl bg-brand-primary px-4 py-3 font-bold text-primary-inverted"
					data-tid={REWARDS_STATUS_BUTTON}
					>{hasEnded ? $i18n.rewards.text.view_details : $i18n.rewards.text.check_status}
				</div>
			</section>
		</article>
	</div>
</button>

<script lang="ts">
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		REWARDS_MODAL_DATE_BADGE,
		REWARDS_MODAL_IMAGE_BANNER
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { isEndedCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		reward: RewardCampaignDescription;
	}

	let { reward }: Props = $props();

	const hasEnded = $derived(isEndedCampaign(reward.endDate));
</script>

<div class="relative mb-5 max-h-60 overflow-hidden rounded-2xl">
	<Img
		alt={replacePlaceholders($i18n.rewards.alt.reward_banner, {
			$campaignName: resolveText({ i18n: $i18n, path: reward.cardTitle })
		})}
		grayscale={hasEnded}
		src={reward.cardBanner}
		testId={REWARDS_MODAL_IMAGE_BANNER}
	/>

	<span class="absolute right-4 top-4">
		<RewardDateBadge date={reward.endDate} testId={REWARDS_MODAL_DATE_BADGE} />
	</span>
</div>

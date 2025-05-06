<script lang="ts">
	import type { RewardDescription } from '$env/types/env-reward';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isEndedCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		reward: RewardDescription;
	}

	let { reward }: Props = $props();

	const hasEnded = $derived(isEndedCampaign(reward.endDate));
</script>

<div class="mb-5 max-h-60 overflow-hidden rounded-2xl">
	<Img
		src={reward.logo}
		testId={REWARDS_MODAL_IMAGE_BANNER}
		grayscale={hasEnded}
		alt={replacePlaceholders($i18n.rewards.alt.reward_logo, {
			$campaignName: reward.cardTitle
		})}
	/>
</div>

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { TRACK_REWARD_FILTER_CHANGE } from '$lib/constants/analytics.contants';
	import { REWARDS_FILTER } from '$lib/constants/test-ids.constants';
	import { RewardStates } from '$lib/enums/reward-states';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		rewardState: RewardStates;
		endedCampaignsAmount?: number;
	}

	let { rewardState = $bindable(), endedCampaignsAmount = 0 }: Props = $props();

	const changeFilter = (toState: RewardStates) => {
		if (rewardState !== toState) {
			trackEvent({
				name: TRACK_REWARD_FILTER_CHANGE,
				metadata: { fromState: rewardState, toState }
			});
		}

		rewardState = toState;
	};
</script>

<div
	class="no-scrollbar mb-5 flex gap-4 overflow-x-auto p-1 md:flex-wrap md:p-0"
	data-tid={REWARDS_FILTER}
>
	<Button
		ariaLabel={$i18n.rewards.text.ongoing}
		colorStyle={rewardState === RewardStates.ONGOING ? 'primary' : 'tertiary'}
		onclick={() => changeFilter(RewardStates.ONGOING)}
		paddingSmall
		styleClass="text-nowrap max-w-28 text-sm"
		testId={`${REWARDS_FILTER}-${RewardStates.ONGOING}-button`}
	>
		{$i18n.rewards.text.ongoing}
	</Button>

	<Button
		ariaLabel={$i18n.rewards.text.ended}
		colorStyle={rewardState === RewardStates.ENDED ? 'primary' : 'tertiary'}
		disabled={endedCampaignsAmount === 0}
		onclick={() => changeFilter(RewardStates.ENDED)}
		paddingSmall
		styleClass="text-nowrap max-w-28 text-sm"
		testId={`${REWARDS_FILTER}-${RewardStates.ENDED}-button`}
	>
		{replacePlaceholders($i18n.rewards.text.ended, { $amount: endedCampaignsAmount.toString() })}
	</Button>
</div>

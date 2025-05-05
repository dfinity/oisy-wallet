<script lang="ts">
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import type { RewardStates } from '$lib/enums/reward-states';
    import type { Writable } from 'svelte/store';

    interface Props {
		rewardState: Writable<RewardStates>;
		endedCampaignsAmount?: number;
	}

	let { rewardState = $bindable(), endedCampaignsAmount = 1 }: Props = $props();
</script>

<RewardsFilter bind:rewardState={$rewardState} {endedCampaignsAmount} />

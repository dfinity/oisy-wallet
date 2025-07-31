<script lang="ts">
	import type { Writable } from 'svelte/store';
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import type { RewardStates } from '$lib/enums/reward-states';

	interface Props {
		rewardState: Writable<RewardStates>;
		endedCampaignsAmount?: number;
	}

	let { rewardState = $bindable(), endedCampaignsAmount = 1 }: Props = $props();
</script>

<RewardsFilter {endedCampaignsAmount} bind:rewardState={$rewardState} />

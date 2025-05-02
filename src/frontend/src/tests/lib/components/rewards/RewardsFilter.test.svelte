<script lang="ts">
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import type { RewardStates } from '$lib/enums/reward-states';

	interface Props {
		rewardState: RewardStates;
	}

	let { rewardState = $bindable() }: Props = $props();
</script>

<RewardsFilter bind:rewardState={$rewardState} />

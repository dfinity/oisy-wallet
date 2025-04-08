<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardModal from '$lib/components/rewards/RewardModal.svelte';
	import { modalRewardDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	let selectedReward: RewardDescription | undefined = undefined;
	$: selectedReward = $modalRewardDetails
		? ($modalStore?.data as RewardDescription | undefined)
		: undefined;
</script>

{#if nonNullish(selectedReward)}
	<RewardModal reward={selectedReward} />
{/if}

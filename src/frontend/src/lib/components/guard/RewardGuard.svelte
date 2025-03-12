<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AirdropStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalRewardState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { loadRewardResult } from '$lib/utils/rewards.utils';

	let isJackpot: boolean | undefined;
	$: isJackpot = $modalRewardState ? ($modalStore?.data as boolean | undefined) : undefined;

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const { receivedReward, receivedJackpot } = await loadRewardResult($authIdentity);
		if (receivedReward) {
			modalStore.openRewardState(receivedJackpot);
		}
	});
</script>

<slot />

{#if $modalRewardState && nonNullish(isJackpot)}
	<AirdropStateModal jackpot={isJackpot} />
{/if}

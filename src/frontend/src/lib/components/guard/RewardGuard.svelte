<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import ReferralStateModal from '$lib/components/referral/ReferralStateModal.svelte';
	import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalReferralState, modalRewardState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { loadRewardResult } from '$lib/utils/rewards.utils';

	let isJackpot: boolean | undefined;
	$: isJackpot = $modalRewardState ? ($modalStore?.data as boolean | undefined) : undefined;

	const modalId = Symbol();

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const { receivedReward, receivedJackpot, receivedReferral } =
			await loadRewardResult($authIdentity);
		if (receivedReward) {
			if (receivedJackpot) {
				modalStore.openRewardState({ id: modalId, data: receivedJackpot });
			} else if (receivedReferral) {
				modalStore.openReferralState();
			} else {
				modalStore.openRewardState({ id: modalId, data: false });
			}
		}
	});
</script>

<slot />

{#if $modalRewardState && nonNullish(isJackpot)}
	<RewardStateModal jackpot={isJackpot} />
{:else if $modalReferralState}
	<ReferralStateModal />
{/if}

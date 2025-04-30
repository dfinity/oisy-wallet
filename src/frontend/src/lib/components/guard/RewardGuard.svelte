<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import ReferralStateModal from '$lib/components/referral/ReferralStateModal.svelte';
	import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalReferralState,
		modalRewardState,
		modalRewardStateData
	} from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { loadRewardResult } from '$lib/utils/rewards.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

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

{@render children?.()}

{#if $modalRewardState && nonNullish($modalRewardStateData)}
	<RewardStateModal jackpot={$modalRewardStateData} />
{:else if $modalReferralState}
	<ReferralStateModal />
{/if}

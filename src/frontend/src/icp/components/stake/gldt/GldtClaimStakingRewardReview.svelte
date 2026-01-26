<script lang="ts">
	import { getContext } from 'svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import GldtStakeTokenFeeModalValue from '$icp/components/stake/gldt/GldtStakeTokenFeeModalValue.svelte';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Amount } from '$lib/types/send';

	interface Props {
		rewardAmount: Amount;
		onClose: () => void;
		onClaimReward: () => void;
	}

	let { rewardAmount, onClose, onClaimReward }: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<StakeReview
	actionButtonLabel={$i18n.stake.text.claim_now}
	amount={rewardAmount}
	{onClose}
	onConfirm={onClaimReward}
>
	{#snippet subtitle()}
		{$i18n.stake.text.claim_reward}
	{/snippet}

	{#snippet destination()}
		<DestinationValue isDestinationCustom={false} token={$sendToken} />
	{/snippet}

	{#snippet network()}
		<IcReviewNetwork />
	{/snippet}

	{#snippet fee()}
		<GldtStakeTokenFeeModalValue>
			{#snippet label()}
				{$i18n.fee.text.network_fee}
			{/snippet}
		</GldtStakeTokenFeeModalValue>
	{/snippet}
</StakeReview>

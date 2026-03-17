<script lang="ts">
	import { getContext } from 'svelte';
	import HarvestStakeFees from '$eth/components/stake/harvest-autopilot/HarvestStakeFees.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount?: OptionAmount;
		onBack: () => void;
		onUnstake: () => void;
	}

	let { amount, onBack, onUnstake }: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalid = $derived(invalidAmount(amount) || Number(amount) === 0);
</script>

<StakeReview
	actionButtonLabel={$i18n.stake.text.unstake_now}
	{amount}
	disabled={invalid}
	{onBack}
	onConfirm={onUnstake}
>
	{#snippet subtitle()}
		{$i18n.stake.text.unstake_review_subtitle}
	{/snippet}

	{#snippet content()}
		<ReviewNetwork sourceNetwork={$sendToken.network} />

		<HarvestStakeFees />
	{/snippet}
</StakeReview>

<script lang="ts">
	import { getContext } from 'svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import GldtStakeFees from '$icp/components/stake/gldt/GldtStakeFees.svelte';
	import GldtStakeProvider from '$icp/components/stake/gldt/GldtStakeProvider.svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Address } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		destination: Address;
		amount?: OptionAmount;
		onBack: () => void;
		onStake: () => void;
	}

	let { destination = '', amount, onBack, onStake }: Props = $props();

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = $derived(
		isInvalidDestinationIc({
			destination,
			tokenStandard: $sendTokenStandard
		}) || invalidAmount(amount)
	);
</script>

<StakeReview {amount} {destination} disabled={invalid} {onBack} {onStake}>
	{#snippet subtitle()}
		{$i18n.stake.text.stake_review_subtitle}
	{/snippet}

	{#snippet provider()}
		<GldtStakeProvider />
	{/snippet}

	{#snippet network()}
		<IcReviewNetwork />
	{/snippet}

	{#snippet fee()}
		<GldtStakeFees />
	{/snippet}
</StakeReview>

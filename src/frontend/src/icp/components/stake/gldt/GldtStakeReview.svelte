<script lang="ts">
	import { getContext } from 'svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import GldtStakeFees from '$icp/components/stake/gldt/GldtStakeFees.svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Address } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		destination: Address;
		amount?: OptionAmount;
		onBack: () => void;
		onStake: () => void;
	}

	let { destination = '', amount, onBack, onStake }: Props = $props();

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeApyStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = $derived(
		isInvalidDestinationIc({
			destination,
			tokenStandard: $sendTokenStandard
		}) || invalidAmount(amount)
	);
</script>

<StakeReview {amount} {destination} disabled={invalid} {onBack} {onStake}>
	{#snippet provider()}
		<StakeProvider currentApy={$gldtStakeApyStore?.apy} provider={StakeProviderType.GLDT} />
	{/snippet}

	{#snippet network()}
		<IcReviewNetwork />
	{/snippet}

	{#snippet fee()}
		<GldtStakeFees />
	{/snippet}
</StakeReview>

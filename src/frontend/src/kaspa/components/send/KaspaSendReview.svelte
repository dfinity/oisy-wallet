<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import KaspaFeeDisplay from '$kaspa/components/fee/KaspaFeeDisplay.svelte';
	import KaspaReviewNetwork from '$kaspa/components/send/KaspaReviewNetwork.svelte';
	import { type KaspaFeeContext, KASPA_FEE_CONTEXT_KEY } from '$kaspa/stores/kaspa-fee.store';
	import { isKaspaAddress } from '$kaspa/utils/kaspa-address.utils';

	interface Props {
		destination: string;
		amount: OptionAmount;
		networkId?: NetworkId;
		selectedContact?: ContactUi;
		onBack: () => void;
		onSend: () => void;
	}

	const {
		destination = '',
		amount,
		networkId,
		selectedContact,
		onBack,
		onSend
	}: Props = $props();

	const { feeStore: fee, feeTokenIdStore: feeTokenId }: KaspaFeeContext =
		getContext<KaspaFeeContext>(KASPA_FEE_CONTEXT_KEY);

	let balanceForFee = $derived(
		nonNullish($feeTokenId) ? ($balancesStore?.[$feeTokenId]?.data ?? ZERO) : undefined
	);

	let insufficientFundsForFee = $derived(
		nonNullish($fee) && nonNullish(balanceForFee) ? $fee > balanceForFee : false
	);

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) || !isKaspaAddress({ address: destination })
	);

	let invalid = $derived(invalidDestination || invalidAmount(amount));

	let disableSend = $derived(insufficientFundsForFee || invalid);
</script>

<SendReview {amount} {destination} disabled={disableSend} {onBack} {onSend} {selectedContact}>
	{#snippet network()}
		<KaspaReviewNetwork {networkId} />
	{/snippet}

	{#snippet fee()}
		<KaspaFeeDisplay />
	{/snippet}

	{#snippet info()}
		{#if insufficientFundsForFee}
			<InsufficientFundsForFee testId="kaspa-send-form-insufficient-funds-for-fee" />
		{/if}
	{/snippet}
</SendReview>

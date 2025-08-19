<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import { invalidSolAddress } from '$sol/utils/sol-address.utils';

	interface Props {
		destination: string;
		amount: OptionAmount;
		network?: Network;
		selectedContact?: ContactUi;
	}

	const { destination = '', amount, network, selectedContact }: Props = $props();

	const {
		feeStore: fee,
		ataFeeStore: ataFee,
		feeTokenIdStore: feeTokenId
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let balanceForFee = $derived(
		nonNullish($feeTokenId) ? ($balancesStore?.[$feeTokenId]?.data ?? ZERO) : undefined
	);

	let insufficientFundsForFee = $derived(
		nonNullish($fee) && nonNullish($ataFee) && nonNullish(balanceForFee)
			? $fee + $ataFee > balanceForFee
			: false
	);

	let invalid = $derived(invalidSolAddress(destination) || invalidAmount(amount));

	let disableSend = $derived(insufficientFundsForFee || invalid);
</script>

<SendReview {amount} {destination} disabled={disableSend} {selectedContact} on:icBack on:icSend>
	<ReviewNetwork slot="network" sourceNetwork={network} />

	<SolFeeDisplay slot="fee" />

	<svelte:fragment slot="info">
		{#if insufficientFundsForFee}
			<InsufficientFundsForFee testId="sol-send-form-insufficient-funds-for-fee" />
		{/if}
	</svelte:fragment>
</SendReview>

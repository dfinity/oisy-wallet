<script lang="ts">
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import { invalidSolAddress } from '$sol/utils/sol-address.utils';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import { getContext } from 'svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

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
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const { sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let insufficientFundsForFee = $derived(
		($fee ?? 0n) + ($ataFee ?? 0n) + BigInt(amount ?? 0) > ($sendBalance ?? 0n)
	);

	let invalid = $derived(invalidSolAddress(destination) || invalidAmount(amount));

	let disableSend = $derived(insufficientFundsForFee || invalid);
</script>

<SendReview on:icBack on:icSend {amount} {destination} {selectedContact} disabled={disableSend}>
	<ReviewNetwork sourceNetwork={network} slot="network" />

	<SolFeeDisplay slot="fee" />

	<svelte:fragment slot="info">
		{#if insufficientFundsForFee}
			<InsufficientFundsForFee testId="sol-send-form-insufficient-funds-for-fee" />
		{/if}
	</svelte:fragment>
</SendReview>

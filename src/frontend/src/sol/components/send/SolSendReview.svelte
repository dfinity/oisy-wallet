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

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let network: Network | undefined = undefined;
	export let selectedContact: ContactUi | undefined = undefined;

	// TODO: add checks for insufficient funds for fee, when we calculate the fee
	const insufficientFundsForFee = false;

	let disableSend: boolean;
	$: disableSend = insufficientFundsForFee || invalid;

	let invalid = true;
	$: invalid = invalidSolAddress(destination) || invalidAmount(amount);
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

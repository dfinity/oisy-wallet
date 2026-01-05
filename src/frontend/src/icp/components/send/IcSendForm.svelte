<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		destination?: string;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		destination = $bindable(''),
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError = $state<IcAmountAssertionError | undefined>();

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard
			})
	);

	let invalid = $derived(invalidDestination || nonNullish(amountError) || isNullish(amount));
</script>

<SendForm
	{cancel}
	{destination}
	disabled={invalid}
	{invalidDestination}
	{onBack}
	{onNext}
	{selectedContact}
>
	{#snippet sendAmount()}
		<IcSendAmount {onTokensList} bind:amount bind:amountError />
	{/snippet}

	{#snippet fee()}
		{#if !$isIcMintingAccount}
			<IcTokenFee />
		{/if}
	{/snippet}
</SendForm>

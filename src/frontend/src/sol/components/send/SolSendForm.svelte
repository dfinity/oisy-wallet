<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';
	import { invalidSolAddress } from '$sol/utils/sol-address.utils';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let selectedContact: ContactUi | undefined = undefined;

	const { feeDecimalsStore, feeSymbolStore, feeTokenIdStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;

	let invalidDestination = false;
	$: invalidDestination = isNullishOrEmpty(destination) || invalidSolAddress(destination);

	let invalid = true;
	$: invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);
</script>

<SendForm
	{destination}
	disabled={invalid}
	{invalidDestination}
	{selectedContact}
	on:icNext
	on:icBack
>
	<SolSendAmount slot="amount" bind:amount bind:amountError on:icTokensList />

	<SolFeeDisplay slot="fee" />

	<SendFeeInfo
		slot="info"
		decimals={$feeDecimalsStore}
		feeSymbol={$feeSymbolStore}
		feeTokenId={$feeTokenIdStore}
	/>

	<slot name="cancel" slot="cancel" />
</SendForm>

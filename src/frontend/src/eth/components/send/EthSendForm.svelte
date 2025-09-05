<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let nativeEthereumToken: Token;
	export let selectedContact: ContactUi | undefined = undefined;

	let insufficientFunds: boolean;

	let invalidDestination = false;
	$: invalidDestination = isNullishOrEmpty(destination) || !isEthAddress(destination);

	let invalid = true;
	$: invalid = invalidDestination || insufficientFunds || isNullish(amount);

	const { feeSymbolStore, feeDecimalsStore, feeTokenIdStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);
</script>

<SendForm
	{destination}
	disabled={invalid}
	{invalidDestination}
	{selectedContact}
	on:icNext
	on:icBack
>
	<EthSendAmount
		slot="amount"
		{nativeEthereumToken}
		bind:amount
		bind:insufficientFunds
		on:icTokensList
	/>

	<EthFeeDisplay slot="fee">
		{#snippet label()}
			<Html text={$i18n.fee.text.max_fee_eth} />
		{/snippet}
	</EthFeeDisplay>

	<SendFeeInfo
		slot="info"
		decimals={$feeDecimalsStore}
		feeSymbol={$feeSymbolStore}
		feeTokenId={$feeTokenIdStore}
	/>

	<slot name="cancel" slot="cancel" />
</SendForm>

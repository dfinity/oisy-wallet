<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, getContext } from 'svelte';
	import { run } from 'svelte/legacy';
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

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		nativeEthereumToken: Token;
		selectedContact?: ContactUi;
		cancel?: Snippet;
	}

	let {
		destination = '',
		amount = $bindable(),
		nativeEthereumToken,
		selectedContact = undefined,
		cancel
	}: Props = $props();

	let insufficientFunds: boolean = $state();

	let invalidDestination = $state(false);
	run(() => {
		invalidDestination = isNullishOrEmpty(destination) || !isEthAddress(destination);
	});

	let invalid = $state(true);
	run(() => {
		invalid = invalidDestination || insufficientFunds || isNullish(amount);
	});

	const { feeSymbolStore, feeDecimalsStore, feeTokenIdStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	const cancel_render = $derived(cancel);
</script>

<SendForm
	{destination}
	disabled={invalid}
	{invalidDestination}
	{selectedContact}
	on:icNext
	on:icBack
>
	{#snippet amount()}
		<EthSendAmount {nativeEthereumToken} bind:amount bind:insufficientFunds on:icTokensList />
	{/snippet}

	<EthFeeDisplay slot="fee">
		{#snippet label()}
			<Html text={$i18n.fee.text.max_fee_eth} />
		{/snippet}
	</EthFeeDisplay>

	{#snippet info()}
		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</SendForm>

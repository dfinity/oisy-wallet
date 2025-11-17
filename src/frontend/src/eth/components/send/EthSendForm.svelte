<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
	import { infuraProviders } from '$eth/providers/infura.providers';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		destination?: string;
		customNonce?: number;
		nativeEthereumToken: Token;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		destination = $bindable(''),
		customNonce = $bindable(),
		nativeEthereumToken,
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	let insufficientFunds = $state(false);

	let invalidDestination = $derived(isNullishOrEmpty(destination) || !isEthAddress(destination));

	let invalid = $derived(invalidDestination || insufficientFunds || isNullish(amount));

	const { feeSymbolStore, feeDecimalsStore, feeTokenIdStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	let highestNonce = $state<number | undefined>();

	let onChainNonce = $state<number | undefined>();

	const updateHighestNonce = async () => {
		const {
			network: { id: networkId }
		} = nativeEthereumToken;

		const { getTransactionCount, getTransactionCount2 } = infuraProviders(networkId);

		if (isNullish($ethAddress)) {
			return;
		}

		highestNonce = (await getTransactionCount($ethAddress)) - 1;

		onChainNonce = (await getTransactionCount2($ethAddress)) - 1;
	};

	$effect(() => {
		[nativeEthereumToken, $ethAddress];

		updateHighestNonce();
	});
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
		<EthSendAmount {nativeEthereumToken} {onTokensList} bind:amount bind:insufficientFunds />
	{/snippet}

	{#snippet fee()}
		<EthFeeDisplay>
			{#snippet label()}
				<Html text={$i18n.fee.text.max_fee_eth} />
			{/snippet}
		</EthFeeDisplay>

		<div>
			<span>Custom Nonce</span>
			<input min="0" placeholder="Custom Nonce" type="number" bind:value={customNonce} />
		</div>

		<div>
			<span>Highest nonce</span>
			<span>{highestNonce}</span>
		</div>

		<div>
			<span>On-chain nonce</span>
			<span>{onChainNonce}</span>
		</div>
	{/snippet}

	{#snippet info()}
		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	{/snippet}
</SendForm>

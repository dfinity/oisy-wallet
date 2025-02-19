<script lang="ts">
	import {isNullish, nonNullish} from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import EthSendDestination from '$eth/components/send/EthSendDestination.svelte';
	import SendInfo from '$eth/components/send/SendInfo.svelte';
	import SendNetworkICP from '$eth/components/send/SendNetworkICP.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {i18n} from "$lib/stores/i18n.store";
	import TokenInput from "$lib/components/tokens/TokenInput.svelte";
	import TokenInputAmountExchange from "$lib/components/tokens/TokenInputAmountExchange.svelte";
	import SendMaxBalanceButton from "$lib/components/send/SendMaxBalanceButton.svelte";
	import type {ConvertAmountErrorType} from "$lib/types/convert";
	import NetworkInfo from "$lib/components/networks/NetworkInfo.svelte";
	import {networks} from "$lib/derived/networks.derived";

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let destinationEditable = true;
	export let amount: OptionAmount = undefined;
	// TODO: to be removed once minterInfo breaking changes have been executed on mainnet
	export let sourceNetwork: EthereumNetwork;

	let errorType: ConvertAmountErrorType = undefined;
	let insufficientFunds: boolean;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination || insufficientFunds || isNullishOrEmpty(destination) || isNullish(amount) || nonNullish(errorType);

	const dispatch = createEventDispatcher();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let targetNetwork: Network | undefined;
	$: targetNetwork = $networks?.find(({id}) => id === sourceNetwork.id);
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<TokenInput
				token={$sendToken}
				bind:amount
				isSelectable={false}
				exchangeRate={$sendTokenExchangeRate}
				bind:errorType
		>
			<span slot="title">{$i18n.core.text.amount}</span>

			<svelte:fragment slot="amount-info">
				{#if nonNullish($sendToken)}
					<div class="text-tertiary">
						<TokenInputAmountExchange
								{amount}
								exchangeRate={$sendTokenExchangeRate}
								token={$sendToken}
								disabled
						/>
					</div>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="balance">
				{#if nonNullish($sendToken)}
					<SendMaxBalanceButton bind:sendAmount={amount} {errorType} />
				{/if}
			</svelte:fragment>
		</TokenInput>

		{#if destinationEditable}
			<EthSendDestination
					token={$sendToken}
					{network}
					bind:destination
					bind:invalidDestination
					on:icQRCodeScan
			/>

			<SendNetworkICP {destination} {sourceNetwork} bind:network />
		{/if}

		{#if nonNullish(targetNetwork)}
			<NetworkInfo network={targetNetwork} />
		{/if}

		<FeeDisplay />

		<SendInfo />

		<ButtonGroup slot="toolbar" testId="toolbar">
			<slot name="cancel" />
			<ButtonNext disabled={invalid} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>

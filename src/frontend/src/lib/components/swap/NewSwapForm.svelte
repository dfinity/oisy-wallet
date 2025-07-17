<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';

	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';

	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import MaxBalanceButton from '../common/MaxBalanceButton.svelte';
	import SwapSlippage from './SwapSlippage.svelte';
	import TokenInputWrapper from '../tokens/TokenInputWrapper.svelte';
	import {
		SUPPORTED_CROSS_SWAP_NETWORKS,
		SWAP_SLIPPAGE_INVALID_VALUE,
		SWAP_SLIPPAGE_VELORA_INVALID_VALUE
	} from '$lib/constants/swap.constants';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		errorType?: TokenActionErrorType;
		customValidate?: (userAmount: bigint) => TokenActionErrorType;
		customErrorValidate?: (userAmount: bigint) => Error | undefined;
		fee?: bigint;
		swapAmountsLoading?: boolean;
		error?: Error | undefined;
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		errorType = $bindable<TokenActionErrorType | undefined>(),
		customValidate = $bindable<(userAmount: bigint) => TokenActionErrorType>(),
		customErrorValidate = $bindable<(userAmount: bigint) => Error | undefined>(),
		fee,
		swapAmountsLoading = false,
		error = $bindable<Error | undefined>()
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	let amountSetToMax = $state(false);
	let exchangeValueUnit: DisplayUnit = $state<DisplayUnit>('usd');
	let inputUnit: DisplayUnit = $derived(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let disableSwitchTokens = $derived(() => {
		if (isNullish($destinationToken?.network.id) || isNullish($sourceToken?.network.id)) {
			return true;
		}

		const condition1 = (nonNullish(swapAmount) && isNullish(receiveAmount)) || swapAmountsLoading;

		const condition2 = !SUPPORTED_CROSS_SWAP_NETWORKS[$destinationToken.network.id]?.includes(
			$sourceToken.network.id
		);

		const condition3 =
			isDefaultEthereumToken($destinationToken) &&
			$destinationToken.network.id !== $sourceToken.network.id;

		return condition1 || condition2 || condition3;
	});

	const onTokensSwitch = () => {
		const tempAmount = receiveAmount;
		swapAmountsStore.reset();
		amountSetToMax = false;
		swapAmount = tempAmount;
		switchTokens();
	};

	$effect(() => {
		if (
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
		) {
			receiveAmount = formatTokenBigintToNumber({
				value: $swapAmountsStore?.selectedProvider?.receiveAmount,
				unitName: $destinationToken.decimals,
				displayDecimals: $destinationToken.decimals
			});
		} else {
			receiveAmount = undefined;
		}
	});

	console.log($swapAmountsStore?.customErrors, 'here here here');
</script>

<div class="relative">
	<TokenInputWrapper
		tokenNetworkId={$sourceToken?.network?.id}
		showWrapper={nonNullish($sourceToken) &&
			nonNullish($destinationToken) &&
			$sourceToken?.network?.id !== $destinationToken?.network.id}
	>
		{#snippet tokenInput()}
			<TokenInput
				bind:amount={swapAmount}
				bind:amountSetToMax
				bind:errorType
				{customValidate}
				token={$sourceToken}
				showErrorMessage={false}
				autofocus={nonNullish($sourceToken)}
				displayUnit={inputUnit}
				exchangeRate={$sourceTokenExchangeRate}
				tokenNetwork={$sourceToken?.network}
				on:click={() => {
					dispatch('icShowTokensList', 'source');
				}}
			>
				<span slot="title">{$i18n.tokens.text.source_token_title}</span>

				<svelte:fragment slot="amount-info">
					{#if nonNullish($sourceToken)}
						<div class="text-tertiary">
							<TokenInputAmountExchange
								amount={swapAmount}
								exchangeRate={$sourceTokenExchangeRate}
								token={$sourceToken}
								bind:displayUnit={exchangeValueUnit}
							/>
						</div>
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="balance">
					{#if nonNullish($sourceToken)}
						<MaxBalanceButton
							bind:amountSetToMax
							bind:amount={swapAmount}
							error={nonNullish(errorType) || nonNullish(error)}
							balance={$sourceTokenBalance}
							token={$sourceToken}
							{fee}
						/>
					{/if}
				</svelte:fragment>
			</TokenInput>
		{/snippet}
	</TokenInputWrapper>

	<SwapSwitchTokensButton disabled={disableSwitchTokens()} on:icSwitchTokens={onTokensSwitch} />
	<TokenInputWrapper
		tokenNetworkId={$destinationToken?.network?.id}
		showWrapper={$sourceToken?.network?.id !== $destinationToken?.network.id}
	>
		{#snippet tokenInput()}
			<TokenInput
				token={$destinationToken}
				amount={receiveAmount}
				displayUnit={inputUnit}
				exchangeRate={$destinationTokenExchangeRate}
				loading={swapAmountsLoading}
				disabled={true}
				tokenNetwork={$destinationToken?.network}
				on:click={() => {
					dispatch('icShowTokensList', 'destination');
				}}
			>
				<span slot="title">{$i18n.tokens.text.destination_token_title}</span>

				<svelte:fragment slot="amount-info">
					{#if nonNullish($destinationToken) && !swapAmountsLoading}
						{#if $swapAmountsStore?.swaps.length === 0}
							<div transition:slide={SLIDE_DURATION} class="text-error-primary">
								{nonNullish($swapAmountsStore.customErrors) &&
								$swapAmountsStore.customErrors.startsWith('Sent amount is too low relative to fees')
									? $i18n.swap.error.sent_amount_is_low
									: nonNullish($swapAmountsStore.customErrors) &&
										  $swapAmountsStore?.customErrors.startsWith('Gas cost exceeds trade amount')
										? $i18n.swap.error.gas_cost_exceeds_trade_amount
										: $i18n.swap.text.swap_is_not_offered}</div
							>
						{:else}
							<div class="flex gap-3 text-tertiary">
								<TokenInputAmountExchange
									amount={receiveAmount}
									exchangeRate={$destinationTokenExchangeRate}
									token={$destinationToken}
									bind:displayUnit={exchangeValueUnit}
								/>

								<SwapValueDifference {swapAmount} {receiveAmount} />
							</div>
						{/if}
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="balance">
					{#if nonNullish($destinationToken)}
						<TokenInputBalance token={$destinationToken} balance={$destinationTokenBalance} />
					{/if}
				</svelte:fragment>
			</TokenInput>
		{/snippet}
	</TokenInputWrapper>
</div>

<SwapSlippage
	bind:slippageValue
	maxSlippageInvalidValue={$sourceToken?.network.id === ICP_NETWORK_ID
		? SWAP_SLIPPAGE_INVALID_VALUE
		: SWAP_SLIPPAGE_VELORA_INVALID_VALUE}
/>

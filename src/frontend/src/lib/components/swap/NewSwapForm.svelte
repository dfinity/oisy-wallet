<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import SwapSlippage from '$lib/components/swap/SwapSlippage.svelte';
	import SwapSwitchTokensButton from '$lib/components/swap/SwapSwitchTokensButton.svelte';
	import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import TokenInputNetworkWrapper from '$lib/components/tokens/TokenInputNetworkWrapper.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		SUPPORTED_CROSS_SWAP_NETWORKS,
		SWAP_SLIPPAGE_INVALID_VALUE,
		SWAP_SLIPPAGE_VELORA_INVALID_VALUE,
	} from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { isNetworkIdICP } from '$lib/utils/network.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		isSwapAmountsLoading: boolean;
		swapDetails?: Snippet;
		errorType?: TokenActionErrorType;
		onCustomValidate: (userAmount: bigint) => TokenActionErrorType;
		fee?: bigint;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		isSwapAmountsLoading,
		swapDetails,
		errorType = $bindable(),
		onCustomValidate,
		fee,
		onShowTokensList,
		onClose,
		onNext
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		sourceTokenBalance,
		destinationTokenExchangeRate,
		switchTokens
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let amountSetToMax = $state(false);
	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let swapAmountsLoading = $derived(
		nonNullish(swapAmount) && nonNullish($swapAmountsStore?.amountForSwap)
			? Number(swapAmount) !== Number($swapAmountsStore.amountForSwap)
			: false
	);

	let showSwapNotOfferedError = $derived(
		nonNullish($swapAmountsStore) &&
			$swapAmountsStore.swaps.length === 0 &&
			!isSwapAmountsLoading &&
			nonNullish(swapAmount) &&
			Number(swapAmount) > 0
	);

	let isSwitchTokensButtonDisabled = $derived(() => {
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

	let invalid = $derived(
		nonNullish(errorType) ||
			isNullish(swapAmount) ||
			Number(swapAmount) <= 0 ||
			isNullish(receiveAmount) ||
			isNullish(fee) ||
			swapAmountsLoading ||
			(nonNullish(slippageValue) && Number(slippageValue) >= SWAP_SLIPPAGE_INVALID_VALUE)
	);

	let isCrossChainNetworks = $derived($sourceToken?.network.id !== $destinationToken?.network.id);

	$effect(() => {
		receiveAmount =
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
				? formatTokenBigintToNumber({
						value: $swapAmountsStore.selectedProvider.receiveAmount,
						unitName: $destinationToken.decimals,
						displayDecimals: $destinationToken.decimals
					})
				: undefined;
	});

	const onTokensSwitch = () => {
		const tempAmount = receiveAmount;
		swapAmountsStore.reset();
		amountSetToMax = false;
		swapAmount = tempAmount;
		switchTokens();
	};
</script>

<ContentWithToolbar>
	<div>
		<div class="relative">
			<div class="mb-2">
				<TokenInputNetworkWrapper
					showGradient={nonNullish($sourceToken) &&
						nonNullish($destinationToken) &&
						isCrossChainNetworks}
					tokenNetworkId={$sourceToken?.network?.id}
				>
					{#snippet tokenInput()}
						<TokenInput
							customValidate={onCustomValidate}
							displayUnit={inputUnit}
							exchangeRate={$sourceTokenExchangeRate}
							showTokenNetwork
							token={$sourceToken}
							bind:amount={swapAmount}
							bind:errorType
							bind:amountSetToMax
							on:click={() => onShowTokensList('source')}
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
									{#if nonNullish(fee)}
										<MaxBalanceButton
											balance={$sourceTokenBalance}
											error={nonNullish(errorType)}
											{fee}
											token={$sourceToken}
											bind:amountSetToMax
											bind:amount={swapAmount}
										/>
									{:else}
										<div class="w-14 sm:w-16">
											<SkeletonText />
										</div>
									{/if}
								{/if}
							</svelte:fragment>
						</TokenInput>
					{/snippet}
				</TokenInputNetworkWrapper>
			</div>

			<SwapSwitchTokensButton
				disabled={isSwitchTokensButtonDisabled()}
				on:icSwitchTokens={onTokensSwitch}
			/>

			<TokenInputNetworkWrapper
				showGradient={isCrossChainNetworks}
				tokenNetworkId={$destinationToken?.network?.id}
			>
				{#snippet tokenInput()}
					<TokenInput
						amount={receiveAmount}
						disabled={true}
						displayUnit={inputUnit}
						exchangeRate={$destinationTokenExchangeRate}
						loading={swapAmountsLoading}
						showTokenNetwork
						token={$destinationToken}
						on:click={() => onShowTokensList('destination')}
					>
						<span slot="title">{$i18n.tokens.text.destination_token_title}</span>

						<svelte:fragment slot="amount-info">
							{#if nonNullish($destinationToken)}
								{#if showSwapNotOfferedError}
									<div class="text-error-primary" transition:slide={SLIDE_DURATION}
										>{$i18n.swap.text.swap_is_not_offered}</div
									>
								{:else}
									<div class="flex gap-3 text-tertiary">
										<TokenInputAmountExchange
											amount={receiveAmount}
											exchangeRate={$destinationTokenExchangeRate}
											token={$destinationToken}
											bind:displayUnit={exchangeValueUnit}
										/>

										{#if swapAmountsLoading}
											<span class="mt-0.5 w-10">
												<SkeletonText />
											</span>
										{:else}
											<SwapValueDifference {receiveAmount} {swapAmount} />
										{/if}
									</div>
								{/if}
							{/if}
						</svelte:fragment>

						<svelte:fragment slot="balance">
							{#if nonNullish($destinationToken)}
								<TokenInputBalance balance={$destinationTokenBalance} token={$destinationToken} />
							{/if}
						</svelte:fragment>
					</TokenInput>
				{/snippet}
			</TokenInputNetworkWrapper>
		</div>

		<SwapSlippage
			bind:slippageValue
			maxSlippageInvalidValue={isNetworkIdICP($sourceToken?.network.id)
				? SWAP_SLIPPAGE_INVALID_VALUE
				: SWAP_SLIPPAGE_VELORA_INVALID_VALUE}
		/>

		{@render swapDetails?.()}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />

			<Button disabled={invalid} onclick={onNext}>
				{$i18n.swap.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

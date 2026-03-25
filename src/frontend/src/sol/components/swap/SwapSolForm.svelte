<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, untrack } from 'svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { estimatePriorityFee } from '$sol/api/solana.api';
	import {
		MICROLAMPORTS_PER_LAMPORT,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';
	import { initFeeStore } from '$sol/stores/sol-fee.store';
	import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	const feeStore = initFeeStore();

	let feeTimer = $state<ReturnType<typeof setInterval> | undefined>();

	const clearFeeTimer = () => {
		if (nonNullish(feeTimer)) {
			clearInterval(feeTimer);
			feeTimer = undefined;
		}
	};

	const estimateSolFee = async () => {
		if (isNullish($sourceToken)) {
			return;
		}

		const solNetwork = safeMapNetworkIdToNetwork($sourceToken.network.id);
		const addresses = isTokenSpl($sourceToken) ? [$sourceToken.address] : undefined;
		const priorityFee = await estimatePriorityFee({ network: solNetwork, addresses });
		const fee = SOLANA_TRANSACTION_FEE_IN_LAMPORTS + priorityFee / MICROLAMPORTS_PER_LAMPORT;
		feeStore.setFee(fee);
	};

	$effect(() => {
		[$sourceToken];

		untrack(() => {
			clearFeeTimer();
			estimateSolFee();
			feeTimer = setInterval(estimateSolFee, 5000);
		});
	});

	onDestroy(clearFeeTimer);

	const customValidate = (userAmount: bigint): TokenActionErrorType | undefined => {
		if (isNullish($sourceToken)) {
			return;
		}

		const parsedSendBalance = nonNullish($sourceTokenBalance)
			? parseToken({
					value: formatToken({
						value: $sourceTokenBalance,
						unitName: $sourceToken.decimals,
						displayDecimals: $sourceToken.decimals
					}),
					unitName: $sourceToken.decimals
				})
			: ZERO;

		if (userAmount > parsedSendBalance) {
			return 'insufficient-funds';
		}
	};

	$effect(() => {
		if (nonNullish($sourceToken) && nonNullish(swapAmount)) {
			const parsedAmount = parseToken({
				value: `${swapAmount}`,
				unitName: $sourceToken.decimals
			});

			const newErrorType = customValidate(parsedAmount);
			if (newErrorType !== errorType) {
				errorType = newErrorType;
			}
		}
	});
</script>

<SwapForm
	{errorType}
	fee={$feeStore}
	{isSwapAmountsLoading}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
>
	{#snippet swapDetails()}
		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider {onShowProviderList} showSelectButton {slippageValue} />
			</div>
		{/if}
	{/snippet}
</SwapForm>

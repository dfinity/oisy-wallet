<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import { parseToken, tryParseToken } from '$lib/utils/parse.utils';
	import SwapSolFees from '$sol/components/swap/SwapSolFees.svelte';
	import { SOL_FEE_CONTEXT_KEY, type FeeContext } from '$sol/stores/sol-fee.store';
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

	const { feeStore, ataFeeStore }: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	let solanaNativeToken = $derived(
		isNetworkIdSOLDevnet($sourceToken?.network.id)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sourceToken?.network.id)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN
	);

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

		if (!isTokenSpl($sourceToken) && nonNullish($feeStore)) {
			if (userAmount + $feeStore > parsedSendBalance) {
				return 'insufficient-funds-for-fee';
			}
		}

		if (isTokenSpl($sourceToken) && nonNullish($feeStore)) {
			const solBalance = $balancesStore?.[solanaNativeToken.id]?.data ?? ZERO;

			const totalFee = $feeStore + ($ataFeeStore ?? ZERO);

			if (solBalance < totalFee) {
				return 'insufficient-funds-for-fee';
			}
		}
	};

	$effect(() => {
		// The error has to go when the amount does: `selectToken` drops `swapAmount` on a
		// source-token change, and the user can empty the input. `errorType` is passed to
		// `SwapForm` one-way here — unlike `SwapIcpForm`, which binds it — so nothing downstream
		// can clear it, and a stale error would hold the form invalid against a blank amount.
		if (isNullish($sourceToken) || isNullish(swapAmount)) {
			errorType = undefined;

			return;
		}

		// Not `parseToken`: the amount outlives a source-token change, so it can carry more
		// precision than the new token has decimals. Throwing here would abort the effect
		// flush mid-update and leave the modal unresponsive, so an amount the token cannot
		// represent is surfaced as a validation error instead.
		const parsedAmount = tryParseToken({
			value: `${swapAmount}`,
			unitName: $sourceToken.decimals
		});

		const newErrorType = isNullish(parsedAmount) ? 'invalid-amount' : customValidate(parsedAmount);

		if (newErrorType !== errorType) {
			errorType = newErrorType;
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

				<SwapSolFees />
			</div>
		{/if}
	{/snippet}
</SwapForm>

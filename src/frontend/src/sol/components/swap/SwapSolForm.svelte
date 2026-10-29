<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
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
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { isLifiFeeAffordable, raiseLifiMaxFee } from '$lib/utils/lifi-fee.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import { parseToken, tryParseToken } from '$lib/utils/parse.utils';
	import SwapSolFees from '$sol/components/swap/SwapSolFees.svelte';
	import { SOL_FEE_CONTEXT_KEY, type FeeContext } from '$sol/stores/sol-fee.store';
	import { isTokenSpl } from '$sol/utils/spl.utils';
	import { isTokenSolanaNative } from '$sol/utils/token.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
		// A LI.FI offer is priced by the wizard: its transaction's own LI.FI ceiling, `undefined` until
		// it is known.
		isLifi?: boolean;
		lifiFee?: bigint;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext,
		isLifi = false,
		lifiFee
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance, amountSetToMax, lifiMaxFee } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { feeStore, ataFeeStore }: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	let solanaNativeToken = $derived(
		isNetworkIdSOLDevnet($sourceToken?.network.id)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sourceToken?.network.id)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN
	);

	const totalFee = $derived(isLifi ? lifiFee : $feeStore);

	// While "Max" holds a LI.FI amount, it leaves room for the highest LI.FI fee seen since for the
	// same destination, so that the amount only steps down, as on EVM (`SwapEthForm`).
	$effect(() => {
		const fee = lifiFee;
		const destinationTokenId = $destinationToken?.id;

		if (!$amountSetToMax || (nonNullish($swapAmountsStore?.selectedProvider) && !isLifi)) {
			lifiMaxFee.set(undefined);
			return;
		}

		if (isLifi && nonNullish(fee) && nonNullish(destinationTokenId)) {
			untrack(() => {
				const reserved = raiseLifiMaxFee({ reserved: $lifiMaxFee, fee, destinationTokenId });

				if (reserved !== $lifiMaxFee) {
					lifiMaxFee.set(reserved);
				}
			});
		}
	});

	// Pressing "Max" again starts from the fee of the moment.
	const onMax = () => {
		if (isLifi) {
			lifiMaxFee.set(
				nonNullish(lifiFee) && nonNullish($destinationToken)
					? { fee: lifiFee, destinationTokenId: $destinationToken.id }
					: undefined
			);
		}
	};

	// The fee "Max" leaves room for; `undefined` while the fee is, which holds the form.
	const maxFee = $derived(
		nonNullish(totalFee) && nonNullish($lifiMaxFee) && $lifiMaxFee.fee > totalFee
			? $lifiMaxFee.fee
			: totalFee
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

		// Not known yet, the form waits.
		if (isLifi) {
			if (isNullish(lifiFee)) {
				return;
			}

			const isNativeSource = isTokenSolanaNative($sourceToken);

			return isLifiFeeAffordable({
				fee: lifiFee,
				amount: userAmount,
				isNativeSource,
				nativeBalance: isNativeSource
					? parsedSendBalance
					: ($balancesStore?.[solanaNativeToken.id]?.data ?? ZERO)
			})
				? undefined
				: 'insufficient-funds-for-fee';
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
	fee={maxFee}
	{isSwapAmountsLoading}
	{onClose}
	onCustomValidate={customValidate}
	{onMax}
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

				<SwapSolFees {isLifi} {lifiFee} />
			</div>
		{/if}
	{/snippet}
</SwapForm>

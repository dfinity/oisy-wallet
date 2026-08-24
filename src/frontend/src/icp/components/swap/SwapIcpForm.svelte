<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapProvider as SwapProviderKey } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { computeChainFusionReceiveAmount } from '$lib/utils/chain-fusion-swap.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		sourceTokenFee?: bigint;
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
		sourceTokenFee,
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	let chainFusionDetails = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProviderKey.CHAIN_FUSION
			? $swapAmountsStore.selectedProvider.swapDetails
			: undefined
	);

	// A ck withdrawal approves once and then burns to the ledger's own minting account, which
	// costs no ledger fee — unlike an ICRC-2 swap to a canister, which pays on both legs. One
	// fee is what the Convert flow reserves for these same directions (`IcTokenFees` →
	// `ConvertAmountSource`), so Max clears the balance instead of stranding a fee, and the
	// number here agrees with the rows `SwapFees` and the provider sheet show.
	let ledgerFeeLegs = $derived($isSourceTokenIcrc2 && isNullish(chainFusionDetails) ? 2n : 1n);

	let totalFee = $derived(
		nonNullish($isSourceTokenIcrc2) ? (sourceTokenFee ?? ZERO) * ledgerFeeLegs : undefined
	);

	let unaffordableExternalFee = $derived(
		chainFusionDetails?.externalFees.find(
			({ fee, token: { id } }) => ($balancesStore?.[id]?.data ?? ZERO) < fee
		)
	);

	let errorMessage = $derived.by(() => {
		if (isNullish(chainFusionDetails) || isNullish($sourceToken)) {
			return undefined;
		}

		const { minimumAmount } = chainFusionDetails;

		if (errorType === 'minimum-amount-not-reached' && nonNullish(minimumAmount)) {
			return replacePlaceholders($i18n.send.assertion.minimum_amount, {
				$amount: formatToken({
					value: minimumAmount,
					unitName: $sourceToken.decimals,
					displayDecimals: $sourceToken.decimals
				}),
				$symbol: $sourceToken.symbol
			});
		}

		if (errorType === 'insufficient-funds-for-fee' && nonNullish(unaffordableExternalFee)) {
			const { token } = unaffordableExternalFee;

			return replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
				$symbol: token.symbol,
				$balance: formatToken({
					value: $balancesStore?.[token.id]?.data ?? ZERO,
					unitName: token.decimals,
					displayDecimals: token.decimals
				})
			});
		}

		if (errorType === 'amount-less-than-ledger-fee') {
			return replacePlaceholders($i18n.send.assertion.minimum_ledger_fees, {
				$symbol: $sourceToken.symbol
			});
		}

		return undefined;
	});

	// Convert renders this one as info, not error: nothing is wrong with the input, the
	// certified read of the minter parameters simply has not landed yet. Named per minter,
	// as `IcConvertForm` does — the two minters are separate configurations.
	let infoMessage = $derived(
		nonNullish(chainFusionDetails) &&
			nonNullish($sourceToken) &&
			errorType === 'minter-info-not-certified'
			? isTokenCkBtcLedger($sourceToken)
				? $i18n.send.info.ckbtc_certified
				: $i18n.send.info.cketh_certified
			: undefined
	);

	const customValidate = (userAmount: bigint): TokenActionErrorType => {
		if (isNullish($sourceToken)) {
			return undefined;
		}

		if (nonNullish(chainFusionDetails)) {
			const { minimumAmount } = chainFusionDetails;

			if (nonNullish(minimumAmount) && userAmount < minimumAmount) {
				return 'minimum-amount-not-reached';
			}

			if (chainFusionDetails.minterInfoCertified === false) {
				return 'minter-info-not-certified';
			}

			if (nonNullish(unaffordableExternalFee)) {
				return 'insufficient-funds-for-fee';
			}

			if (
				computeChainFusionReceiveAmount({
					amount: userAmount,
					sourceFees: chainFusionDetails.sourceFees
				}) === ZERO
			) {
				return 'amount-less-than-ledger-fee';
			}
		}

		return validateUserAmount({
			userAmount,
			token: $sourceToken,
			balance: $sourceTokenBalance,
			fee: totalFee,
			isSwapFlow: true
		});
	};

	const revalidateAgainstOffer = () => {
		if (invalidAmount(swapAmount) || isNullish($sourceToken)) {
			return;
		}

		const parsedValue = tryParseToken({
			value: `${swapAmount}`,
			unitName: $sourceToken.decimals
		});

		if (isNullish(parsedValue)) {
			return;
		}

		errorType = customValidate(parsedValue);
	};

	$effect(() => {
		[chainFusionDetails, unaffordableExternalFee];

		untrack(revalidateAgainstOffer);
	});
</script>

<SwapForm
	fee={totalFee}
	{isSwapAmountsLoading}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
	bind:errorType
>
	{#snippet message()}
		{#if nonNullish(errorMessage) || nonNullish(infoMessage)}
			<div in:fade>
				<MessageBox level={nonNullish(errorMessage) ? 'error' : 'info'}>
					{errorMessage ?? infoMessage}
				</MessageBox>
			</div>
		{/if}
	{/snippet}

	{#snippet swapDetails()}
		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider {onShowProviderList} showSelectButton {slippageValue} />
				<SwapFees />
			</div>
		{/if}
	{/snippet}
</SwapForm>

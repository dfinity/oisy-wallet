<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { oisyTradeSwapEnabled } from '$env/oisy-trade-swap';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		fetchOisyTradeQuote,
		oisyTradeSwapPairTable
	} from '$lib/services/oisy-trade-swap.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
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
	import { findOisyTradePair } from '$lib/utils/oisy-trade-swap.utils';
	import { formatTradeAmount, toPairView } from '$lib/utils/oisy-trade.utils';
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
	//
	// The two-leg branch is load-bearing for OISY Trade as well, for its own reason: its
	// deposit is `icrc2_approve` + `icrc2_transfer_from`, and the canister requires the
	// on-ledger balance to cover `amount + 2 × ledger_fee`. It only ever quotes ICRC-2
	// sources and is never Chain Fusion, so it lands on this branch by construction —
	// narrowing the condition would silently make Max unspendable there.
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

	// OISY Trade is the only ICP provider that can refuse an otherwise fine amount: a
	// fill-or-kill order has to sit on its pair's lot grid and inside the pair's notional
	// bounds, so an off-grid amount simply produces no offer. Naming that reason is only
	// honest when it is the whole story — while any other provider still quotes, the swap
	// *is* offered and the grid is OISY Trade's business alone. Hence the empty-offer-list
	// gate, which mirrors the one `SwapForm` puts on its own generic message.
	let noOfferQuoted = $derived(
		nonNullish($swapAmountsStore) &&
			$swapAmountsStore.swaps.length === 0 &&
			!isSwapAmountsLoading &&
			nonNullish(swapAmount) &&
			Number(swapAmount) > 0
	);

	let oisyTradePair = $derived.by(() => {
		// `pairs` is read for its reactivity as much as for the guard: the table lives in
		// `oisyTradeStore`, and `oisyTradeSwapPairTable` reaches it through `get`, which on
		// its own would not re-run this when a table that loaded late finally lands.
		const { pairs } = $oisyTradeStore;

		if (
			!oisyTradeSwapEnabled ||
			isNullish(pairs) ||
			isNullish($sourceToken) ||
			isNullish($destinationToken)
		) {
			return undefined;
		}

		return findOisyTradePair({
			sourceToken: $sourceToken,
			destinationToken: $destinationToken,
			table: oisyTradeSwapPairTable()
		});
	});

	// Asked of the service rather than read off the fan-out: the fan-out carries offers
	// only, so a rejection never reaches the store. The quote is a synchronous read over
	// the already-cached pair table, so asking again here costs nothing.
	let oisyTradeErrorKind = $derived.by(() => {
		if (
			!noOfferQuoted ||
			// A source ledger without ICRC-2 cannot be deposited on OISY Trade at all —
			// the fan-out drops its quote in the mapping branch — so the grid is not the
			// reason there is no offer, and naming a lot size would wrongly imply that
			// fixing the amount could produce one.
			$isSourceTokenIcrc2 !== true ||
			isNullish(oisyTradePair) ||
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			!isIcToken($sourceToken) ||
			!isIcToken($destinationToken)
		) {
			return undefined;
		}

		const sourceAmount = tryParseToken({
			value: `${swapAmount}`,
			unitName: $sourceToken.decimals
		});

		if (isNullish(sourceAmount)) {
			return undefined;
		}

		const result = fetchOisyTradeQuote({
			sourceToken: $sourceToken,
			destinationToken: $destinationToken,
			sourceAmount
		});

		return result.ok ? undefined : result.errorKind;
	});

	// The shipped Limit Order copy, filled from the same `toPairView` fields that
	// `LimitOrderTradePairBox` fills it from, so the two surfaces cannot come to disagree
	// about what is orderable.
	let oisyTradeNotOfferedMessage = $derived.by(() => {
		if (isNullish(oisyTradeErrorKind) || isNullish(oisyTradePair)) {
			return undefined;
		}

		const {
			baseSymbol,
			quoteSymbol,
			baseDecimals,
			quoteDecimals,
			lotSize,
			minNotional,
			maxNotional
		} = toPairView(oisyTradePair);
		const t = $i18n.trading.limit_order;

		switch (oisyTradeErrorKind) {
			case 'lot':
				return replacePlaceholders(t.error_lot_multiple, {
					$step: formatTradeAmount({ amount: lotSize, decimals: baseDecimals }),
					$symbol: baseSymbol
				});
			case 'min_notional':
				return replacePlaceholders(t.error_min_notional, {
					$amount: formatTradeAmount({ amount: minNotional, decimals: quoteDecimals }),
					$symbol: quoteSymbol
				});
			case 'max_notional':
				return replacePlaceholders(t.error_max_notional, {
					$amount: formatTradeAmount({ amount: maxNotional ?? 0, decimals: quoteDecimals }),
					$symbol: quoteSymbol
				});
			// `balance` is unreachable here: the quote deliberately validates with no balance,
			// so an unaffordable amount still produces an offer and the form's own
			// insufficient-funds check reports it, exactly as for every other provider.
			default:
				return undefined;
		}
	});

	// Both are error-level and mutually exclusive in practice: a Chain Fusion input error
	// needs an offer to exist, and this message only appears when none did.
	let messageBoxError = $derived(errorMessage ?? oisyTradeNotOfferedMessage);

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
	notOfferedExplained={nonNullish(oisyTradeNotOfferedMessage)}
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
		{#if nonNullish(messageBoxError) || nonNullish(infoMessage)}
			<div in:fade>
				<MessageBox level={nonNullish(messageBoxError) ? 'error' : 'info'}>
					{messageBoxError ?? infoMessage}
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

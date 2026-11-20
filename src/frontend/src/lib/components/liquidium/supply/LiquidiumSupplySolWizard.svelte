<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { Chain } from '@liquidium/client';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import LiquidiumSupplyForm from '$lib/components/liquidium/supply/LiquidiumSupplyForm.svelte';
	import LiquidiumSupplyProgress from '$lib/components/liquidium/supply/LiquidiumSupplyProgress.svelte';
	import LiquidiumSupplyReview from '$lib/components/liquidium/supply/LiquidiumSupplyReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
	import { sendLiquidiumSol } from '$lib/services/liquidium-sol.services';
	import { executeLiquidiumSupply } from '$lib/services/liquidium-supply.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
	import { LiquidiumSolTransferRefusedError } from '$lib/types/errors';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import {
		SOL_FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$sol/stores/sol-fee.store';
	import { mapSolanaErrorMsg } from '$sol/utils/sol-error.utils';

	interface Props {
		market: LiquidiumMarket;
		amount: OptionAmount;
		supplyProgressStep: string;
		inflowFee?: bigint;
		inflowFeeUnavailable?: boolean;
		// Least gross transfer Liquidium credits, from the per-account quote.
		minimumSendAmount?: bigint;
		currentStep?: WizardStep;
		onSelectToken?: () => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		market,
		amount = $bindable(),
		supplyProgressStep = $bindable(),
		inflowFee,
		inflowFeeUnavailable,
		minimumSendAmount,
		currentStep,
		onSelectToken,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendToken, sendTokenDecimals, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount)
			? parseToken({ value: `${amount}`, unitName: $sendTokenDecimals })
			: undefined
	);

	const feeStore = initFeeStore();
	const prioritizationFeeStore = initFeeStore();
	const ataFeeStore = initFeeStore();
	const feeSymbolStore = writable<string | undefined>(SOLANA_TOKEN.symbol);
	const feeTokenIdStore = writable<TokenId | undefined>(SOLANA_TOKEN.id);
	const feeDecimalsStore = writable<number | undefined>(SOLANA_TOKEN.decimals);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[SOLANA_TOKEN.id]?.usd);
	});

	setContext<FeeContextType>(
		SOL_FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			prioritizationFeeStore,
			ataFeeStore,
			feeSymbolStore,
			feeDecimalsStore,
			feeTokenIdStore,
			feeExchangeRateStore
		})
	);

	// The transfer (amount + provider fee) and its network fee both leave the SOL balance.
	let validateSupplyAmount = $derived.by(() => {
		const balance = $sendBalance;
		const inflow = inflowFee;
		const networkFee = $feeStore;

		return (userAmount: bigint): Error | undefined =>
			nonNullish(inflow) &&
			nonNullish(balance) &&
			userAmount + inflow + (networkFee ?? ZERO) > balance
				? new Error($i18n.liquidium.text.insufficient_funds_for_fee)
				: undefined;
	});

	const supply = async () => {
		if (isNullish($authIdentity) || isNullish($ethAddress) || isNullish($solAddressMainnet)) {
			toastsError({ msg: { text: $i18n.send.assertion.address_unknown } });
			return;
		}

		if (isNullish(inflowFee) || isNullish($feeStore)) {
			toastsError({ msg: { text: $i18n.send.assertion.gas_fees_not_defined } });
			return;
		}

		if (isNullish(parsedAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		const identity = $authIdentity;
		const source = $solAddressMainnet;
		const prioritizationFee = $prioritizationFeeStore ?? ZERO;

		// Set once the transfer is handed to Solana: a failure before that sent nothing.
		let broadcastStarted = false;

		onNext();

		try {
			await executeLiquidiumSupply({
				identity,
				ethAddress: $ethAddress,
				poolId: market.poolId,
				chain: Chain.SOL,
				asset: market.asset,
				amount: parsedAmount,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (supplyProgressStep = step),
				broadcast: async ({ target, amount: transferAmount, beforeBroadcast }) => {
					broadcastStarted = true;

					return await sendLiquidiumSol({
						identity,
						source,
						destination: target.address,
						amount: transferAmount,
						prioritizationFee,
						beforeBroadcast
					});
				}
			});

			supplyProgressStep = ProgressStepsLiquidiumSupply.DONE;

			setTimeout(onClose, 750);
		} catch (err: unknown) {
			// The SOL may have left, and its row stays until it settles. The form would offer the full
			// amount again, so the flow closes instead.
			if (broadcastStarted && !(err instanceof LiquidiumSolTransferRefusedError)) {
				toastsErrorNoTrace({ msg: { text: $i18n.send.error.solana_confirmation_failed }, err });

				onClose();

				return;
			}

			// The refusal's own message is not for the user: the toast shows the failure it wraps, as the
			// SOL send does.
			const cause = err instanceof LiquidiumSolTransferRefusedError ? err.cause : err;

			toastsError({
				msg: { text: mapSolanaErrorMsg(cause) ?? $i18n.liquidium.text.transaction_failed },
				err: cause
			});

			onBack();
		}
	};
</script>

{#snippet feeDisplay()}
	{#if nonNullish($feeStore)}
		<FeeDisplay
			decimals={SOLANA_TOKEN.decimals}
			exchangeRate={$feeExchangeRateStore}
			feeAmount={$feeStore}
			symbol={SOLANA_TOKEN.symbol}
		>
			{#snippet label()}{$i18n.liquidium.text.transaction_fee}{/snippet}
		</FeeDisplay>
	{/if}
{/snippet}

<SolFeeContext
	observe={currentStep?.name !== WizardStepsLiquidiumSupply.SUPPLYING}
	token={$sendToken}
>
	{#if currentStep?.name === WizardStepsLiquidiumSupply.REVIEW}
		<LiquidiumSupplyReview {amount} {feeDisplay} {inflowFee} {market} {onBack} onConfirm={supply} />
	{:else if currentStep?.name === WizardStepsLiquidiumSupply.SUPPLYING}
		<LiquidiumSupplyProgress {supplyProgressStep} />
	{:else}
		<LiquidiumSupplyForm
			{feeDisplay}
			{inflowFee}
			{inflowFeeUnavailable}
			{market}
			{minimumSendAmount}
			{onClose}
			onCustomErrorValidate={validateSupplyAmount}
			{onNext}
			{onSelectToken}
			totalFee={$feeStore}
			bind:amount
		/>
	{/if}
</SolFeeContext>

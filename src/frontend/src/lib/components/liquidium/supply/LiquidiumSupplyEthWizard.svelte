<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { send } from '$eth/services/send.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import LiquidiumSupplyForm from '$lib/components/liquidium/supply/LiquidiumSupplyForm.svelte';
	import LiquidiumSupplyProgress from '$lib/components/liquidium/supply/LiquidiumSupplyProgress.svelte';
	import LiquidiumSupplyReview from '$lib/components/liquidium/supply/LiquidiumSupplyReview.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
	import { executeLiquidiumSupply } from '$lib/services/liquidium-supply.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		market: LiquidiumMarket;
		amount: OptionAmount;
		supplyProgressStep: string;
		inflowFee?: bigint;
		inflowFeeUnavailable?: boolean;
		currentStep?: WizardStep;
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
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendToken, sendTokenDecimals, sendTokenId, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let sourceNetwork = $derived($sendToken.network as EthereumNetwork);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount)
			? parseToken({ value: `${amount}`, unitName: $sendTokenDecimals })
			: undefined
	);

	const feeStore = initEthFeeStore();
	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	let nativeEthereumToken = $derived(
		[...$enabledEvmTokens, ...$enabledEthereumTokens].find(
			({ network: { id: networkId } }) => $sendToken.network.id === networkId
		)
	);

	let isNativeSend = $derived(
		isSupportedEthTokenId($sendTokenId) || isSupportedEvmNativeTokenId($sendTokenId)
	);

	let nativeFeeBalance = $derived(
		nonNullish(nativeEthereumToken) ? $balancesStore?.[nativeEthereumToken.id]?.data : undefined
	);

	$effect(() => {
		if (nonNullish(nativeEthereumToken)) {
			feeSymbolStore.set(nativeEthereumToken.symbol);
			feeTokenIdStore.set(nativeEthereumToken.id);
			feeDecimalsStore.set(nativeEthereumToken.decimals);
			feeExchangeRateStore.set($exchanges?.[nativeEthereumToken.id]?.usd);
		}
	});

	let feeContext = $state<EthFeeContext | undefined>();
	const evaluateFee = () => feeContext?.triggerUpdateFee();

	const ethFeeContext = initEthFeeContext({
		feeStore,
		feeSymbolStore,
		feeTokenIdStore,
		feeDecimalsStore,
		feeExchangeRateStore,
		evaluateFee
	});

	setContext<FeeContextType>(ETH_FEE_CONTEXT_KEY, ethFeeContext);

	const { maxGasFee } = ethFeeContext;

	let validateSupplyAmount = $derived.by(() => {
		const balance = $sendBalance;
		const inflow = inflowFee;
		const gasFee = $maxGasFee;
		const nativeBalance = nativeFeeBalance;
		const native = isNativeSend;

		return (userAmount: bigint): Error | undefined => {
			if (isNullish(inflow) || isNullish(balance)) {
				return undefined;
			}

			if (userAmount + inflow + (native ? (gasFee ?? ZERO) : ZERO) > balance) {
				return new Error($i18n.liquidium.text.insufficient_funds_for_fee);
			}

			if (!native && nonNullish(gasFee) && nonNullish(nativeBalance) && nativeBalance < gasFee) {
				return new Error($i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees);
			}

			return undefined;
		};
	});

	// Re-evaluate the gas fee whenever the amount changes (mirrors the stake wizard).
	$effect(() => {
		amount;

		untrack(() => evaluateFee());
	});

	const supply = async () => {
		if (
			isNullish($authIdentity) ||
			isNullish($ethAddress) ||
			isNullish($feeStore) ||
			isNullish(inflowFee)
		) {
			toastsError({ msg: { text: $i18n.send.assertion.gas_fees_not_defined } });
			return;
		}

		if (isNullish(parsedAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $feeStore;

		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({ msg: { text: $i18n.send.assertion.max_gas_fee_per_gas_undefined } });
			return;
		}

		const amountBaseUnits = parsedAmount;

		onNext();

		try {
			await executeLiquidiumSupply({
				identity: $authIdentity,
				ethAddress: $ethAddress,
				poolId: market.poolId,
				asset: market.asset,
				amount: amountBaseUnits,
				inflowFee,
				displayAmount: `${amount}`,
				progress: (step) => (supplyProgressStep = step),
				broadcast: async ({ target, amount: transferAmount }) => {
					const { hash } = await send({
						identity: $authIdentity,
						from: $ethAddress,
						to: target.address,
						amount: transferAmount,
						token: $sendToken,
						sourceNetwork,
						maxFeePerGas,
						maxPriorityFeePerGas,
						gas
					});

					return hash;
				}
			});

			supplyProgressStep = ProgressStepsLiquidiumSupply.DONE;

			setTimeout(onClose, 750);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed }, err });

			onBack();
		}
	};
</script>

{#snippet feeDisplay()}
	<EthFeeDisplay>
		{#snippet label()}{$i18n.fee.text.network_fee}{/snippet}
	</EthFeeDisplay>
{/snippet}

{#if nonNullish(nativeEthereumToken)}
	<EthFeeContext
		bind:this={feeContext}
		{amount}
		destination={$ethAddress ?? ''}
		{nativeEthereumToken}
		observe={currentStep?.name !== WizardStepsLiquidiumSupply.SUPPLYING}
		sendToken={$sendToken}
		sendTokenId={$sendTokenId}
		{sourceNetwork}
	>
		{#if currentStep?.name === WizardStepsLiquidiumSupply.REVIEW}
			<LiquidiumSupplyReview
				{amount}
				{feeDisplay}
				{inflowFee}
				{market}
				{onBack}
				onConfirm={supply}
			/>
		{:else if currentStep?.name === WizardStepsLiquidiumSupply.SUPPLYING}
			<LiquidiumSupplyProgress {supplyProgressStep} />
		{:else}
			<LiquidiumSupplyForm
				{feeDisplay}
				{inflowFee}
				{inflowFeeUnavailable}
				{market}
				{onClose}
				onCustomErrorValidate={validateSupplyAmount}
				{onNext}
				totalFee={$maxGasFee}
				bind:amount
			/>
		{/if}
	</EthFeeContext>
{/if}

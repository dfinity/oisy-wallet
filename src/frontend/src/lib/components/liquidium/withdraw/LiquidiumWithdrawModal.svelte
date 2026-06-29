<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import LiquidiumWithdrawForm from '$lib/components/liquidium/withdraw/LiquidiumWithdrawForm.svelte';
	import LiquidiumWithdrawProgress from '$lib/components/liquidium/withdraw/LiquidiumWithdrawProgress.svelte';
	import LiquidiumWithdrawReview from '$lib/components/liquidium/withdraw/LiquidiumWithdrawReview.svelte';
	import { liquidiumWithdrawWizardSteps } from '$lib/config/lend-borrow.config';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { liquidiumAssetPrices, liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { ProgressStepsLiquidiumWithdraw } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumWithdraw } from '$lib/enums/wizard-steps';
	import {
		computeLiquidiumWithdrawPreview,
		executeLiquidiumWithdraw
	} from '$lib/services/liquidium-withdraw.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		reserve: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	let modal: WizardModal<WizardStepsLiquidiumWithdraw> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLiquidiumWithdraw> | undefined = $state();
	let amount: OptionAmount = $state();
	let confirmChecked = $state(false);
	let withdrawProgressStep: string = $state(ProgressStepsLiquidiumWithdraw.INITIALIZATION);

	const steps: WizardSteps<WizardStepsLiquidiumWithdraw> = $derived(
		liquidiumWithdrawWizardSteps({ i18n: $i18n })
	);

	let withdrawToken = $derived(LIQUIDIUM_ASSET_TOKENS[reserve.asset]);
	let withdrawPrice = $derived($liquidiumAssetPrices[reserve.asset] ?? 0);

	let withdrawUsd = $derived((Number(amount) || 0) * withdrawPrice);

	let preview = $derived(
		nonNullish($liquidiumPortfolio)
			? computeLiquidiumWithdrawPreview({ portfolio: $liquidiumPortfolio, reserve, withdrawUsd })
			: undefined
	);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount) && nonNullish(withdrawToken)
			? parseToken({ value: `${amount}`, unitName: withdrawToken.decimals })
			: undefined
	);

	let receiverAddress = $derived(reserve.chain === 'BTC' ? $btcAddressMainnet : $ethAddress);

	const reset = () => {
		amount = undefined;
		confirmChecked = false;
		withdrawProgressStep = ProgressStepsLiquidiumWithdraw.INITIALIZATION;
		currentStep = undefined;
	};

	const close = () => closeModal(reset);

	const withdraw = async () => {
		const identity = $authIdentity;

		if (
			isNullish(identity) ||
			isNullish($ethAddress) ||
			isNullish(receiverAddress) ||
			isNullish(parsedAmount)
		) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		const amountBaseUnits = parsedAmount;
		const receiver = receiverAddress;

		modal?.next();

		try {
			await executeLiquidiumWithdraw({
				identity,
				ethAddress: $ethAddress,
				poolId: reserve.poolId,
				asset: reserve.asset,
				amount: amountBaseUnits,
				receiverAddress: receiver,
				displayAmount: `${amount}`,
				progress: (step) => (withdrawProgressStep = step)
			});

			withdrawProgressStep = ProgressStepsLiquidiumWithdraw.DONE;

			setTimeout(close, 750);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed }, err });

			modal?.back();
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsLiquidiumWithdraw.WITHDRAWING}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if nonNullish($liquidiumPortfolio) && nonNullish(preview)}
		{#if currentStep?.name === WizardStepsLiquidiumWithdraw.REVIEW}
			<LiquidiumWithdrawReview
				{amount}
				onBack={() => modal?.back()}
				onConfirm={withdraw}
				{preview}
				{reserve}
				{withdrawPrice}
			/>
		{:else if currentStep?.name === WizardStepsLiquidiumWithdraw.WITHDRAWING}
			<LiquidiumWithdrawProgress {withdrawProgressStep} />
		{:else}
			<LiquidiumWithdrawForm
				onClose={close}
				onNext={() => modal?.next()}
				portfolio={$liquidiumPortfolio}
				{preview}
				{reserve}
				{withdrawPrice}
				{withdrawToken}
				bind:amount
				bind:confirmChecked
			/>
		{/if}
	{/if}
</WizardModal>

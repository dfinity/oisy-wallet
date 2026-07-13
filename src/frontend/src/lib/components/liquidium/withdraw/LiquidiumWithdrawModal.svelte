<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import LiquidiumSelectTokenForm from '$lib/components/liquidium/LiquidiumSelectTokenForm.svelte';
	import LiquidiumWithdrawForm from '$lib/components/liquidium/withdraw/LiquidiumWithdrawForm.svelte';
	import LiquidiumWithdrawProgress from '$lib/components/liquidium/withdraw/LiquidiumWithdrawProgress.svelte';
	import LiquidiumWithdrawReview from '$lib/components/liquidium/withdraw/LiquidiumWithdrawReview.svelte';
	import LiquidiumWithdrawTokensList from '$lib/components/liquidium/withdraw/LiquidiumWithdrawTokensList.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
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
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		// Supplied position to withdraw from; token-less launches pick one via the picker.
		reserve?: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	// Seeded from the initial prop only; later switches happen through the picker.
	// svelte-ignore state_referenced_locally
	let selectedReserve = $state<LiquidiumReserve | undefined>(reserve);

	let modal: WizardModal<WizardStepsLiquidiumWithdraw> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLiquidiumWithdraw> | undefined = $state();
	let amount: OptionAmount = $state();
	let confirmChecked = $state(false);
	let withdrawProgressStep: string = $state(ProgressStepsLiquidiumWithdraw.INITIALIZATION);

	const tokensListContext = initModalTokensListContext({ tokens: [] });
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	const steps: WizardSteps<WizardStepsLiquidiumWithdraw> = $derived(
		liquidiumWithdrawWizardSteps({ i18n: $i18n })
	);

	let withdrawToken = $derived(
		nonNullish(selectedReserve) ? LIQUIDIUM_ASSET_TOKENS[selectedReserve.asset] : undefined
	);
	let withdrawPrice = $derived(
		nonNullish(selectedReserve) ? ($liquidiumAssetPrices[selectedReserve.asset] ?? 0) : 0
	);

	let withdrawUsd = $derived((Number(amount) || 0) * withdrawPrice);

	let preview = $derived(
		nonNullish($liquidiumPortfolio) && nonNullish(selectedReserve)
			? computeLiquidiumWithdrawPreview({
					portfolio: $liquidiumPortfolio,
					reserve: selectedReserve,
					withdrawUsd
				})
			: undefined
	);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount) && nonNullish(withdrawToken)
			? parseToken({ value: `${amount}`, unitName: withdrawToken.decimals })
			: undefined
	);

	let receiverAddress = $derived(
		selectedReserve?.chain === 'BTC' ? $btcAddressMainnet : $ethAddress
	);

	const goToStep = (stepName: WizardStepsLiquidiumWithdraw) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Always enter the picker with a clean query so it never reopens filtered from a
	// previous visit (mirrors the swap / trade-deposit flows).
	const enterTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumWithdraw.TOKENS_LIST);
	};

	// Cancelling the picker returns to the Withdraw step — the amount form when a position
	// is chosen, or the select-token prompt on a neutral launch.
	const closeTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumWithdraw.WITHDRAW);
	};

	const selectReserve = (nextReserve: LiquidiumReserve) => {
		selectedReserve = nextReserve;
		// The typed amount is token-specific; drop it when switching.
		amount = undefined;
		confirmChecked = false;
		closeTokensList();
	};

	// The modal is not guaranteed to unmount between opens, so restore every piece of
	// launch state — including the selected reserve and the picker filters — back to what
	// the initial prop implies; otherwise the next open (or a neutral launch) inherits the
	// previously picked token / a stale filter query.
	const reset = () => {
		selectedReserve = reserve;
		amount = undefined;
		confirmChecked = false;
		withdrawProgressStep = ProgressStepsLiquidiumWithdraw.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);

	const withdraw = async () => {
		const identity = $authIdentity;

		if (
			isNullish(identity) ||
			isNullish($ethAddress) ||
			isNullish(receiverAddress) ||
			isNullish(parsedAmount) ||
			isNullish(selectedReserve)
		) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		const amountBaseUnits = parsedAmount;
		const receiver = receiverAddress;
		const { poolId, asset } = selectedReserve;

		modal?.next();

		try {
			await executeLiquidiumWithdraw({
				identity,
				ethAddress: $ethAddress,
				poolId,
				asset,
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

	{#if currentStep?.name === WizardStepsLiquidiumWithdraw.TOKENS_LIST}
		<LiquidiumWithdrawTokensList
			onClose={closeTokensList}
			onSelectReserve={selectReserve}
			{selectedReserve}
		/>
	{:else if isNullish(selectedReserve)}
		<LiquidiumSelectTokenForm onClose={close} onSelectToken={enterTokensList} />
	{:else if nonNullish($liquidiumPortfolio) && nonNullish(preview)}
		{#if currentStep?.name === WizardStepsLiquidiumWithdraw.REVIEW}
			<LiquidiumWithdrawReview
				{amount}
				onBack={() => modal?.back()}
				onConfirm={withdraw}
				{preview}
				reserve={selectedReserve}
				{withdrawPrice}
			/>
		{:else if currentStep?.name === WizardStepsLiquidiumWithdraw.WITHDRAWING}
			<LiquidiumWithdrawProgress {withdrawProgressStep} />
		{:else}
			<LiquidiumWithdrawForm
				onClose={close}
				onNext={() => modal?.next()}
				onSelectToken={enterTokensList}
				portfolio={$liquidiumPortfolio}
				{preview}
				reserve={selectedReserve}
				{withdrawPrice}
				{withdrawToken}
				bind:amount
				bind:confirmChecked
			/>
		{/if}
	{/if}
</WizardModal>

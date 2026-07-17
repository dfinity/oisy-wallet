<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Asset, Chain } from '@liquidium/client';
	import { setContext } from 'svelte';
	import LiquidiumSelectTokenForm from '$lib/components/liquidium/LiquidiumSelectTokenForm.svelte';
	import LiquidiumRepayBtcWizard from '$lib/components/liquidium/repay/LiquidiumRepayBtcWizard.svelte';
	import LiquidiumRepayEthWizard from '$lib/components/liquidium/repay/LiquidiumRepayEthWizard.svelte';
	import LiquidiumRepayIcrcWizard from '$lib/components/liquidium/repay/LiquidiumRepayIcrcWizard.svelte';
	import LiquidiumRepayTokensList from '$lib/components/liquidium/repay/LiquidiumRepayTokensList.svelte';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { liquidiumRepayWizardSteps } from '$lib/config/lend-borrow.config';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
	import { getLiquidiumMaxRepayAmount } from '$lib/services/liquidium-repay.services';
	import { estimateLiquidiumInflowFee } from '$lib/services/liquidium-supply.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		// Position with debt to repay; token-less launches pick one via the picker.
		reserve?: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	// Seeded from the initial prop only; later switches happen through the picker.
	// svelte-ignore state_referenced_locally
	let selectedReserve = $state<LiquidiumReserve | undefined>(reserve);

	let token = $derived(
		nonNullish(selectedReserve) ? LIQUIDIUM_ASSET_TOKENS[selectedReserve.asset] : undefined
	);

	const tokensListContext = initModalTokensListContext({ tokens: [] });
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	// Provider inflow fee for this asset (repayment is an inflow), passed to the wizard.
	let inflowFee = $state<bigint | undefined>();
	// The estimate failed (e.g. stale oracle price): surface a retry message and block submit.
	// Account-based repay has no SDK-sanctioned fee fallback (that exists only for instant loans),
	// so it degrades gracefully like Supply rather than guessing a fee.
	let inflowFeeUnavailable = $state(false);
	// Full outstanding debt (base units) — the "Max (full debt)" cap.
	let maxRepay = $state<bigint | undefined>();

	$effect(() => {
		const identity = $authIdentity;

		if (nonNullish(identity) && nonNullish(selectedReserve)) {
			const { asset, chain, poolId } = selectedReserve;

			inflowFee = undefined;
			inflowFeeUnavailable = false;
			maxRepay = undefined;

			// Reserve data widens asset/chain to open strings; narrow to the SDK's strict types here.
			estimateLiquidiumInflowFee({
				identity,
				asset: asset as Asset,
				chain: chain as Chain
			})
				.then((fee) => (inflowFee = fee))
				.catch((err: unknown) => {
					consoleError(err);
					inflowFeeUnavailable = true;
				});

			getLiquidiumMaxRepayAmount({ identity, ethAddress: $ethAddress, poolId })
				.then((amount) => (maxRepay = amount ?? undefined))
				.catch(consoleError);
		}
	});

	let modal: WizardModal<WizardStepsLiquidiumRepay> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLiquidiumRepay> | undefined = $state();
	let amount: OptionAmount = $state();
	let repayProgressStep: string = $state(ProgressStepsLiquidiumRepay.INITIALIZATION);

	const steps: WizardSteps<WizardStepsLiquidiumRepay> = $derived(
		liquidiumRepayWizardSteps({ i18n: $i18n })
	);

	const goToStep = (stepName: WizardStepsLiquidiumRepay) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Always enter the picker with a clean query so it never reopens filtered from a
	// previous visit (mirrors the swap / trade-deposit flows).
	const enterTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumRepay.TOKENS_LIST);
	};

	// Cancelling the picker returns to the Repay step — the amount form when a position
	// is chosen, or the select-token prompt on a neutral launch.
	const closeTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumRepay.REPAY);
	};

	const selectReserve = (nextReserve: LiquidiumReserve) => {
		selectedReserve = nextReserve;
		// The typed amount is token-specific; drop it when switching.
		amount = undefined;
		closeTokensList();
	};

	// The modal is not guaranteed to unmount between opens, so restore every piece of
	// launch state — including the selected reserve, its fee/debt estimates and the picker
	// filters — back to what the initial prop implies; otherwise the next open (or a neutral
	// launch) inherits the previously picked token / a stale fee-error / a stale filter query.
	const reset = () => {
		selectedReserve = reserve;
		amount = undefined;
		inflowFee = undefined;
		inflowFeeUnavailable = false;
		maxRepay = undefined;
		repayProgressStep = ProgressStepsLiquidiumRepay.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);
</script>

<TokenActionContext {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsLiquidiumRepay.REPAYING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#if currentStep?.name === WizardStepsLiquidiumRepay.TOKENS_LIST}
			<LiquidiumRepayTokensList
				onClose={closeTokensList}
				onSelectReserve={selectReserve}
				{selectedReserve}
			/>
		{:else if isNullish(selectedReserve)}
			<LiquidiumSelectTokenForm onClose={close} onSelectToken={enterTokensList} />
		{:else if nonNullish($liquidiumPortfolio)}
			{#if selectedReserve.chain === 'BTC'}
				<LiquidiumRepayBtcWizard
					{currentStep}
					{inflowFee}
					{inflowFeeUnavailable}
					{maxRepay}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					onSelectToken={enterTokensList}
					portfolio={$liquidiumPortfolio}
					reserve={selectedReserve}
					bind:amount
					bind:repayProgressStep
				/>
			{:else if selectedReserve.chain === 'ICP'}
				<LiquidiumRepayIcrcWizard
					{currentStep}
					{inflowFee}
					{inflowFeeUnavailable}
					{maxRepay}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					onSelectToken={enterTokensList}
					portfolio={$liquidiumPortfolio}
					reserve={selectedReserve}
					bind:amount
					bind:repayProgressStep
				/>
			{:else}
				<LiquidiumRepayEthWizard
					{currentStep}
					{inflowFee}
					{inflowFeeUnavailable}
					{maxRepay}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					onSelectToken={enterTokensList}
					portfolio={$liquidiumPortfolio}
					reserve={selectedReserve}
					bind:amount
					bind:repayProgressStep
				/>
			{/if}
		{/if}
	</WizardModal>
</TokenActionContext>

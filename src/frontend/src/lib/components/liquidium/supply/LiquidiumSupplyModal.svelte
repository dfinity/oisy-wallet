<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Asset, Chain } from '@liquidium/client';
	import { setContext } from 'svelte';
	import LiquidiumSelectTokenForm from '$lib/components/liquidium/LiquidiumSelectTokenForm.svelte';
	import LiquidiumSupplyBtcWizard from '$lib/components/liquidium/supply/LiquidiumSupplyBtcWizard.svelte';
	import LiquidiumSupplyEthWizard from '$lib/components/liquidium/supply/LiquidiumSupplyEthWizard.svelte';
	import LiquidiumSupplyIcrcWizard from '$lib/components/liquidium/supply/LiquidiumSupplyIcrcWizard.svelte';
	import LiquidiumSupplyTokensList from '$lib/components/liquidium/supply/LiquidiumSupplyTokensList.svelte';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { liquidiumSupplyWizardSteps } from '$lib/config/lend-borrow.config';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
	import { estimateLiquidiumInflowFee } from '$lib/services/liquidium-supply.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		market?: LiquidiumMarket;
	}

	let { market }: Props = $props();

	// Seeded from the initial prop only; later switches happen through the picker.
	// svelte-ignore state_referenced_locally
	let selectedMarket = $state<LiquidiumMarket | undefined>(market);

	let token = $derived(
		nonNullish(selectedMarket) ? LIQUIDIUM_ASSET_TOKENS[selectedMarket.asset] : undefined
	);

	const tokensListContext = initModalTokensListContext({ tokens: [] });
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	let inflowFee = $state<bigint | undefined>();
	// The estimate failed (e.g. stale oracle price): surface a retry message and block submit.
	let inflowFeeUnavailable = $state(false);

	$effect(() => {
		const identity = $authIdentity;

		if (nonNullish(identity) && nonNullish(selectedMarket)) {
			const asset = selectedMarket.asset as Asset;
			const chain = selectedMarket.chain as Chain;

			inflowFee = undefined;
			inflowFeeUnavailable = false;

			estimateLiquidiumInflowFee({ identity, asset, chain })
				.then((fee) => (inflowFee = fee))
				.catch((err: unknown) => {
					consoleError(err);
					inflowFeeUnavailable = true;
				});
		}
	});

	let modal: WizardModal<WizardStepsLiquidiumSupply> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLiquidiumSupply> | undefined = $state();
	let amount: OptionAmount = $state();
	let supplyProgressStep: string = $state(ProgressStepsLiquidiumSupply.INITIALIZATION);

	const steps: WizardSteps<WizardStepsLiquidiumSupply> = $derived(
		liquidiumSupplyWizardSteps({ i18n: $i18n })
	);

	const goToStep = (stepName: WizardStepsLiquidiumSupply) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Always enter the picker with a clean query so it never reopens filtered from a
	// previous visit (mirrors the swap / trade-deposit flows).
	const enterTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumSupply.TOKENS_LIST);
	};

	// Cancelling the picker returns to the Supply step — the amount form when a market
	// is chosen, or the select-token prompt on a neutral launch.
	const closeTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumSupply.SUPPLY);
	};

	const selectMarket = (nextMarket: LiquidiumMarket) => {
		selectedMarket = nextMarket;
		// The typed amount is token-specific; drop it when switching.
		amount = undefined;
		closeTokensList();
	};

	// The modal is not guaranteed to unmount between opens, so restore every piece of
	// launch state — including the selected market, its fee estimate and the picker
	// filters — back to what the initial prop implies; otherwise the next open (or a
	// neutral launch) inherits the previously picked token / a stale fee-error / a
	// stale filter query.
	const reset = () => {
		selectedMarket = market;
		amount = undefined;
		inflowFee = undefined;
		inflowFeeUnavailable = false;
		supplyProgressStep = ProgressStepsLiquidiumSupply.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);
</script>

<TokenActionContext {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsLiquidiumSupply.SUPPLYING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#if currentStep?.name === WizardStepsLiquidiumSupply.TOKENS_LIST}
			<LiquidiumSupplyTokensList
				onClose={closeTokensList}
				onSelectMarket={selectMarket}
				{selectedMarket}
			/>
		{:else if isNullish(selectedMarket)}
			<LiquidiumSelectTokenForm onClose={close} onSelectToken={enterTokensList}>
				<MessageBox styleClass="sm:text-sm !items-center">
					{$i18n.liquidium.text.supply_collateral_info}
				</MessageBox>
			</LiquidiumSelectTokenForm>
		{:else if selectedMarket.chain === 'BTC'}
			<LiquidiumSupplyBtcWizard
				{currentStep}
				{inflowFee}
				{inflowFeeUnavailable}
				market={selectedMarket}
				onBack={modal.back}
				onClose={close}
				onNext={modal.next}
				onSelectToken={enterTokensList}
				bind:amount
				bind:supplyProgressStep
			/>
		{:else if selectedMarket.chain === 'ICP'}
			<LiquidiumSupplyIcrcWizard
				{currentStep}
				{inflowFee}
				{inflowFeeUnavailable}
				market={selectedMarket}
				onBack={modal.back}
				onClose={close}
				onNext={modal.next}
				onSelectToken={enterTokensList}
				bind:amount
				bind:supplyProgressStep
			/>
		{:else}
			<LiquidiumSupplyEthWizard
				{currentStep}
				{inflowFee}
				{inflowFeeUnavailable}
				market={selectedMarket}
				onBack={modal.back}
				onClose={close}
				onNext={modal.next}
				onSelectToken={enterTokensList}
				bind:amount
				bind:supplyProgressStep
			/>
		{/if}
	</WizardModal>
</TokenActionContext>

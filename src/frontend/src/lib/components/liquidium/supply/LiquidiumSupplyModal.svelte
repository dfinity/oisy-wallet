<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Asset, Chain } from '@liquidium/client';
	import LiquidiumSupplyBtcWizard from '$lib/components/liquidium/supply/LiquidiumSupplyBtcWizard.svelte';
	import LiquidiumSupplyEthWizard from '$lib/components/liquidium/supply/LiquidiumSupplyEthWizard.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { liquidiumSupplyWizardSteps } from '$lib/config/lend-borrow.config';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
	import { estimateLiquidiumInflowFee } from '$lib/services/liquidium-supply.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		market: LiquidiumMarket;
	}

	let { market }: Props = $props();

	let token = $derived(LIQUIDIUM_ASSET_TOKENS[market.asset]);

	// Provider inflow fee for this asset, passed to the wizard.
	let inflowFee = $state<bigint | undefined>();
	// The estimate failed (e.g. stale oracle price): surface a retry message and block submit.
	let inflowFeeUnavailable = $state(false);

	$effect(() => {
		const identity = $authIdentity;

		if (nonNullish(identity)) {
			inflowFeeUnavailable = false;

			// Market data widens asset/chain to open strings (future assets); narrow to
			// the SDK's strict mutating-flow types at this boundary.
			estimateLiquidiumInflowFee({
				identity,
				asset: market.asset as Asset,
				chain: market.chain as Chain
			})
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

	const reset = () => {
		amount = undefined;
		supplyProgressStep = ProgressStepsLiquidiumSupply.INITIALIZATION;
		currentStep = undefined;
	};

	const close = () => closeModal(reset);
</script>

{#if nonNullish(token)}
	<SendTokenContext {token}>
		<WizardModal
			bind:this={modal}
			disablePointerEvents={currentStep?.name === WizardStepsLiquidiumSupply.SUPPLYING}
			onClose={close}
			{steps}
			bind:currentStep
		>
			{#snippet title()}{currentStep?.title ?? ''}{/snippet}

			{#if market.chain === 'BTC'}
				<LiquidiumSupplyBtcWizard
					{currentStep}
					{inflowFee}
					{inflowFeeUnavailable}
					{market}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					bind:amount
					bind:supplyProgressStep
				/>
			{:else}
				<LiquidiumSupplyEthWizard
					{currentStep}
					{inflowFee}
					{inflowFeeUnavailable}
					{market}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					bind:amount
					bind:supplyProgressStep
				/>
			{/if}
		</WizardModal>
	</SendTokenContext>
{/if}

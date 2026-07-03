<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Asset, Chain } from '@liquidium/client';
	import LiquidiumRepayBtcWizard from '$lib/components/liquidium/repay/LiquidiumRepayBtcWizard.svelte';
	import LiquidiumRepayEthWizard from '$lib/components/liquidium/repay/LiquidiumRepayEthWizard.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
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
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		reserve: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	let token = $derived(LIQUIDIUM_ASSET_TOKENS[reserve.asset]);

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

		if (nonNullish(identity)) {
			inflowFeeUnavailable = false;

			// Reserve data widens asset/chain to open strings; narrow to the SDK's strict types here.
			estimateLiquidiumInflowFee({
				identity,
				asset: reserve.asset as Asset,
				chain: reserve.chain as Chain
			})
				.then((fee) => (inflowFee = fee))
				.catch((err: unknown) => {
					consoleError(err);
					inflowFeeUnavailable = true;
				});

			getLiquidiumMaxRepayAmount({ identity, ethAddress: $ethAddress, poolId: reserve.poolId })
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

	const reset = () => {
		amount = undefined;
		repayProgressStep = ProgressStepsLiquidiumRepay.INITIALIZATION;
		currentStep = undefined;
	};

	const close = () => closeModal(reset);
</script>

{#if nonNullish(token) && nonNullish($liquidiumPortfolio)}
	<SendTokenContext {token}>
		<WizardModal
			bind:this={modal}
			disablePointerEvents={currentStep?.name === WizardStepsLiquidiumRepay.REPAYING}
			onClose={close}
			{steps}
			bind:currentStep
		>
			{#snippet title()}{currentStep?.title ?? ''}{/snippet}

			{#if reserve.chain === 'BTC'}
				<LiquidiumRepayBtcWizard
					{currentStep}
					{inflowFee}
					{inflowFeeUnavailable}
					{maxRepay}
					onBack={modal.back}
					onClose={close}
					onNext={modal.next}
					portfolio={$liquidiumPortfolio}
					{reserve}
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
					portfolio={$liquidiumPortfolio}
					{reserve}
					bind:amount
					bind:repayProgressStep
				/>
			{/if}
		</WizardModal>
	</SendTokenContext>
{/if}

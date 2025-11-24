<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import GetTokenWizardStep from '$lib/components/get-token/GetTokenWizardStep.svelte';
	import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
	import SwapModalWizardSteps from '$lib/components/swap/SwapModalWizardSteps.svelte';
	import { getTokenWizardSteps } from '$lib/config/get-token.config';
	import { SWAP_DEFAULT_SLIPPAGE_VALUE } from '$lib/constants/swap.constants';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsGetToken } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { WizardStepsGetTokenType } from '$lib/types/get-token';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapSelectTokenType } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		token: Token;
		currentApy: number;
	}

	let { token, currentApy }: Props = $props();

	let steps = $derived(
		getTokenWizardSteps({ i18n: $i18n, tokenSymbol: getTokenDisplaySymbol(token) })
	);

	let currentStep = $state<WizardStep<WizardStepsGetTokenType> | undefined>();
	let modal = $state<WizardModal<WizardStepsGetTokenType>>();

	let showSelectProviderModal = $state<boolean>(false);
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let slippageValue = $state<OptionAmount>(SWAP_DEFAULT_SLIPPAGE_VALUE);
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let swapFailedProgressSteps = $state<ProgressStepsSwap[]>([]);
	let allNetworksEnabled = $state<boolean>(true);

	let showSwapWizard = $derived(
		currentStep?.name === WizardStepsGetToken.SWAP ||
			currentStep?.name === WizardStepsGetToken.REVIEW ||
			currentStep?.name === WizardStepsGetToken.SWAPPING ||
			currentStep?.name === WizardStepsGetToken.SELECT_PROVIDER ||
			currentStep?.name === WizardStepsGetToken.TOKENS_LIST ||
			currentStep?.name === WizardStepsGetToken.FILTER_NETWORKS
	);

	const reset = (fullReset = false) => {
		if (fullReset) {
			currentStep = undefined;
		}

		selectTokenType = undefined;
		swapProgressStep = ProgressStepsSwap.INITIALIZATION;
		showSelectProviderModal = false;
	};

	const close = () =>
		closeModal(() => {
			reset(true);
		});

	const closeSwapWizard = () => {
		if (currentStep?.name === WizardStepsGetToken.SWAPPING) {
			close();
		} else {
			goToStep(WizardStepsGetToken.GET_TOKEN);
			reset();
		}
	};

	const goToStep = (stepName: WizardStepsGetTokenType) => {
		if (nonNullish(modal)) {
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};
</script>

<SwapContexts>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsGetToken.SWAPPING ||
			currentStep?.name === WizardStepsGetToken.FILTER_NETWORKS}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsGetToken.GET_TOKEN}
				<GetTokenWizardStep {currentApy} onClose={close} onGoToStep={goToStep} {token} />
			{:else if showSwapWizard}
				<SwapModalWizardSteps
					{currentStep}
					{modal}
					onClose={closeSwapWizard}
					{steps}
					bind:swapAmount
					bind:receiveAmount
					bind:slippageValue
					bind:swapProgressStep
					bind:swapFailedProgressSteps
					bind:allNetworksEnabled
					bind:showSelectProviderModal
					bind:selectTokenType
				/>
			{/if}
		{/key}
	</WizardModal>
</SwapContexts>

<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SwapModalWizardSteps from '$lib/components/swap/SwapModalWizardSteps.svelte';
	import { swapWizardSteps } from '$lib/config/swap.config';
	import { SWAP_DEFAULT_SLIPPAGE_VALUE } from '$lib/constants/swap.constants';
	import { SWAP_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapSelectTokenType } from '$lib/types/swap';
	import { closeModal } from '$lib/utils/modal.utils';

	let modal = $state<WizardModal<WizardStepsSwap>>();

	let steps = $derived<WizardSteps<WizardStepsSwap>>(swapWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsSwap> | undefined>();
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
	let showSelectProviderModal = $state<boolean>(false);
	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let slippageValue = $state<OptionAmount>(SWAP_DEFAULT_SLIPPAGE_VALUE);
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let swapFailedProgressSteps = $state<ProgressStepsSwap[]>([]);
	let allNetworksEnabled = $state<boolean>(true);

	let titleString = $derived(
		selectTokenType === 'source'
			? $i18n.swap.text.select_source_token
			: selectTokenType === 'destination'
				? $i18n.swap.text.select_destination_token
				: showSelectProviderModal
					? $i18n.swap.text.select_swap_provider
					: (currentStep?.title ?? '')
	);

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
			selectTokenType = undefined;
			showSelectProviderModal = false;
		});
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsSwap.SWAPPING || showSelectProviderModal}
	onClose={close}
	{steps}
	testId={SWAP_TOKENS_MODAL}
	bind:currentStep
>
	{#snippet title()}{titleString}{/snippet}

	<SwapModalWizardSteps
		{currentStep}
		{modal}
		onClose={close}
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
</WizardModal>

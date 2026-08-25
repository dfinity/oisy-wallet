<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import TipIntro from '$lib/components/tip/TipIntro.svelte';
	import TipTokensList from '$lib/components/tip/TipTokensList.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { tipWizardSteps } from '$lib/config/tip.config';
	import { WizardStepsTip } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let modal: WizardModal<WizardStepsTip> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTip> | undefined = $state();
	let selectedToken: Token | undefined = $state();

	const tokensListContext = initModalTokensListContext({ tokens: [] });
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	const steps: WizardSteps<WizardStepsTip> = $derived(tipWizardSteps({ i18n: $i18n }));

	const goToStep = (stepName: WizardStepsTip) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Always enter the picker with a clean query, so it never reopens filtered from
	// a previous visit (mirrors the swap and lend flows).
	const enterTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsTip.TOKENS_LIST);
	};

	const onSelectToken = (token: Token) => {
		selectedToken = token;
		goToStep(WizardStepsTip.CREATE);
	};
</script>

<WizardModal bind:this={modal} onClose={modalStore.close} {steps} bind:currentStep>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if currentStep?.name === WizardStepsTip.TOKENS_LIST}
		<TipTokensList onClose={() => goToStep(WizardStepsTip.INTRO)} {onSelectToken} />
	{:else if currentStep?.name === WizardStepsTip.CREATE}
		<!-- The amount / expiry / message step arrives with the create flow. -->
		<p class="text-tertiary">{selectedToken?.symbol ?? ''}</p>
	{:else}
		<TipIntro onGetStarted={enterTokensList} onViewHistory={modalStore.close} />
	{/if}
</WizardModal>

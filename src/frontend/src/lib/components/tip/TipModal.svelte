<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import TipCreate from '$lib/components/tip/TipCreate.svelte';
	import TipIntro from '$lib/components/tip/TipIntro.svelte';
	import TipTokensList from '$lib/components/tip/TipTokensList.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { tipWizardSteps } from '$lib/config/tip.config';
	import { DEFAULT_TIP_EXPIRY_MS } from '$lib/constants/tip.constants';
	import { WizardStepsTip } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let modal: WizardModal<WizardStepsTip> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTip> | undefined = $state();
	let selectedToken: IcToken | undefined = $state();
	let amount: OptionAmount = $state();
	let durationMs: number = $state(DEFAULT_TIP_EXPIRY_MS);
	let message = $state('');

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

	const onSelectToken = (token: IcToken) => {
		selectedToken = token;
		goToStep(WizardStepsTip.CREATE);
	};
</script>

<TokenActionContext token={selectedToken}>
	<WizardModal bind:this={modal} onClose={modalStore.close} {steps} bind:currentStep>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#if currentStep?.name === WizardStepsTip.TOKENS_LIST}
			<TipTokensList onClose={() => goToStep(WizardStepsTip.INTRO)} {onSelectToken} />
		{:else if currentStep?.name === WizardStepsTip.CREATE && nonNullish(selectedToken)}
			<TipCreate
				onClose={modalStore.close}
				onNext={() => goToStep(WizardStepsTip.SHARE)}
				onSelectToken={enterTokensList}
				token={selectedToken}
				bind:amount
				bind:durationMs
				bind:message
			/>
		{:else}
			<TipIntro onGetStarted={enterTokensList} onViewHistory={modalStore.close} />
		{/if}
	</WizardModal>
</TokenActionContext>

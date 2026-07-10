<script lang="ts">
	import { setContext } from 'svelte';
	import LimitOrderWizard from '$lib/components/trading/limit-order/LimitOrderWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { limitOrderWizardSteps } from '$lib/config/limit-order.config';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { ProgressStepsLimitOrder } from '$lib/enums/progress-steps';
	import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { closeModal } from '$lib/utils/modal.utils';

	let modal: WizardModal<WizardStepsLimitOrder> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLimitOrder> | undefined = $state();
	let progressStep: string = $state(ProgressStepsLimitOrder.INITIALIZATION);

	const steps: WizardSteps<WizardStepsLimitOrder> = $derived(
		limitOrderWizardSteps({ i18n: $i18n })
	);

	// Shared token-picker context, reused from the swap token list so the
	// base/quote choosing steps get the same search + filters UX. The picker
	// steps seed the eligible tokens via `setTokens`. Honor the page's selected
	// network like the send modal: the default "All networks" view is
	// pseudo-chain-fusion (mainnet-only), so without this a testnet DEX (staging)
	// would strip its own TESTICP/ckSepolia* tokens from the picker.
	const tokensListContext = initModalTokensListContext({
		tokens: [],
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- initialized once at mount; the page network is fixed for the modal's lifetime.
		filterNetwork: $selectedNetwork,
		// `LimitOrderTokensList` already sets the right balance per leg (the
		// deposited DEX balance for the spend leg, the wallet balance for the
		// receive leg — see its comments). Without this, the default sort
		// re-maps every token against the wallet balances store, silently
		// overwriting the spend leg's deposited balance, same as `WithdrawModal`.
		sortByBalance: false
	});
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	const reset = () => {
		progressStep = ProgressStepsLimitOrder.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsLimitOrder.PLACING ||
		currentStep?.name === WizardStepsLimitOrder.BASE_TOKEN ||
		currentStep?.name === WizardStepsLimitOrder.QUOTE_TOKEN}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if modal}
		<LimitOrderWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			{steps}
			bind:progressStep
			bind:modal
		/>
	{/if}
</WizardModal>

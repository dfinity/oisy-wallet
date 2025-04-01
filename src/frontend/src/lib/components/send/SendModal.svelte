<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher, setContext } from 'svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import SendTokensList from '$lib/components/send/SendTokensList.svelte';
	import SendWizard from '$lib/components/send/SendWizard.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import { allSendWizardSteps, sendWizardStepsWithQrCodeScan } from '$lib/config/send.config';
	import { SEND_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let isTransactionsPage: boolean;

	let networkId: NetworkId | undefined = undefined;
	$: networkId = targetNetwork?.id;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	let steps: WizardSteps;
	$: steps = isTransactionsPage
		? sendWizardStepsWithQrCodeScan({ i18n: $i18n })
		: allSendWizardSteps({ i18n: $i18n });

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const dispatch = createEventDispatcher();

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: $enabledTokens,
			filterZeroBalance: true,
			filterNetwork: $selectedNetwork
		})
	);

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			targetNetwork = undefined;

			sendProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});

	const isDisabled = (): boolean => $ethAddressNotLoaded;

	const nextStep = async ({ detail: token }: CustomEvent<Token>) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		// eslint-disable-next-line require-await
		const callback = async () => {
			goToStep(WizardStepsSend.SEND);
		};
		await loadTokenAndRun({ token, callback });
	};

	const goToStep = (stepName: WizardStepsSend) =>
		goToWizardSendStep({
			modal,
			steps,
			stepName: stepName
		});

	// TODO: Use network id to get the address to support bitcoin.
	let source: string;
	$: source = $icrcAccountIdentifierText ?? '';
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSend.SENDING ||
		currentStep?.name === WizardStepsSend.FILTER_NETWORKS}
	testId={SEND_TOKENS_MODAL}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === WizardStepsSend.TOKENS_LIST}
		<SendTokensList
			on:icSendToken={nextStep}
			on:icSelectNetworkFilter={() => goToStep(WizardStepsSend.FILTER_NETWORKS)}
		/>
	{:else if currentStep?.name === WizardStepsSend.FILTER_NETWORKS}
		<ModalNetworksFilter on:icNetworkFilter={() => goToStep(WizardStepsSend.TOKENS_LIST)} />
	{:else}
		<SendWizard
			{source}
			{currentStep}
			bind:destination
			bind:networkId
			bind:targetNetwork
			bind:amount
			bind:sendProgressStep
			formCancelAction={isTransactionsPage ? 'close' : 'back'}
			on:icBack={modal.back}
			on:icSendBack={() => goToStep(WizardStepsSend.TOKENS_LIST)}
			on:icNext={modal.next}
			on:icClose={close}
			on:icQRCodeScan={() =>
				goToWizardSendStep({
					modal,
					steps,
					stepName: WizardStepsSend.QR_CODE_SCAN
				})}
			on:icQRCodeBack={() =>
				goToWizardSendStep({
					modal,
					steps,
					stepName: WizardStepsSend.SEND
				})}
		/>
	{/if}
</WizardModal>

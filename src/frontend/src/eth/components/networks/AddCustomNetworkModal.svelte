<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import AddCustomNetworkForm from '$eth/components/networks/AddCustomNetworkForm.svelte';
	import AddCustomNetworkReview from '$eth/components/networks/AddCustomNetworkReview.svelte';
	import type { VerifyChainIdResult } from '$eth/services/chain-id-verification.services';
	import {
		verifyCustomEvmNetworkForm,
		type CustomEvmNetworkFormErrors,
		type CustomEvmNetworkFormValues
	} from '$eth/services/custom-network-form.services';
	import {
		customEvmNetworksStore,
		type CustomEvmNetworkInput
	} from '$eth/stores/custom-evm-networks.store';
	import { ADD_CUSTOM_NETWORK_MODAL } from '$lib/constants/test-ids.constants';
	import { WizardStepsAddCustomNetwork } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		onClose?: () => void;
		/**
		 * Test-seam for the network-level chain-ID probe. Passed through to
		 * `verifyCustomEvmNetworkForm`, which still runs the pure parser
		 * first — so required-field / syntactic errors never hit the network
		 * in tests or in production. Undefined in production (the service
		 * falls back to the real `verifyChainId`).
		 *
		 * This is dependency injection — not an event callback — so the
		 * `on`-prefix rule does not apply.
		 */
		// eslint-disable-next-line svelte/require-event-prefix
		probe?: (args: { rpcUrl: string; expectedChainId: bigint }) => Promise<VerifyChainIdResult>;
	}

	let { onClose, probe }: Props = $props();

	const initialValues: CustomEvmNetworkFormValues = {
		name: '',
		chainId: '',
		rpcUrl: '',
		currencySymbol: '',
		explorerUrl: '',
		iconUrl: '',
		env: 'mainnet'
	};

	let values: CustomEvmNetworkFormValues = $state({ ...initialValues });
	let errors: CustomEvmNetworkFormErrors = $state({});
	let verifying = $state(false);
	let saving = $state(false);
	let banner: { message: string } | undefined = $state();
	let verifiedInput: CustomEvmNetworkInput | undefined = $state();

	const steps: WizardSteps<WizardStepsAddCustomNetwork> = $derived([
		{
			name: WizardStepsAddCustomNetwork.FORM,
			title: $i18n.custom_networks.text.add_title
		},
		{
			name: WizardStepsAddCustomNetwork.REVIEW,
			title: $i18n.custom_networks.text.review_title
		}
	]);

	let currentStep: WizardStep<WizardStepsAddCustomNetwork> | undefined = $state();
	let modal: WizardModal<WizardStepsAddCustomNetwork> | undefined = $state();

	const close = () => {
		modalStore.close();
		onClose?.();
	};

	const handleVerify = async () => {
		errors = {};
		banner = undefined;
		verifying = true;

		try {
			const result = await verifyCustomEvmNetworkForm({
				values,
				...(probe !== undefined ? { probe } : {})
			});

			if (result.status === 'invalid') {
				({ errors } = result);
				return;
			}

			if (result.status === 'chain-mismatch') {
				banner = {
					message: $i18n.custom_networks.error.chain_mismatch
						.replace('$actualChainId', result.actualChainId.toString())
						.replace('$expectedChainId', result.input.chainId.toString())
				};
				return;
			}

			if (result.status === 'rpc-unreachable') {
				banner = {
					message: $i18n.custom_networks.error.rpc_unreachable.replace('$error', result.error)
				};
				return;
			}

			// status === 'verified'
			verifiedInput = result.input;
			modal?.next();
		} finally {
			verifying = false;
		}
	};

	const handleConfirm = () => {
		if (verifiedInput === undefined) {
			return;
		}
		saving = true;
		try {
			customEvmNetworksStore.add(verifiedInput);
			close();
		} catch (err: unknown) {
			// The only expected failure here is a duplicate chainId: another
			// tab could have added it between Verify and Add. Surface a banner
			// on the form step and let the user change the ID.
			banner = {
				message:
					err instanceof Error && err.message.includes('already been added')
						? $i18n.custom_networks.error.duplicate
						: err instanceof Error
							? err.message
							: `${err}`
			};
			verifiedInput = undefined;
			modal?.set(0);
		} finally {
			saving = false;
		}
	};

	const handleBack = () => {
		verifiedInput = undefined;
		modal?.back();
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={verifying || saving}
	onClose={close}
	{steps}
	testId={ADD_CUSTOM_NETWORK_MODAL}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if currentStep?.name === WizardStepsAddCustomNetwork.REVIEW && verifiedInput !== undefined}
		<AddCustomNetworkReview
			input={verifiedInput}
			onBack={handleBack}
			onConfirm={handleConfirm}
			{saving}
		/>
	{:else}
		<AddCustomNetworkForm
			{banner}
			{errors}
			onCancel={close}
			onVerify={handleVerify}
			{verifying}
			bind:values
		/>
	{/if}
</WizardModal>

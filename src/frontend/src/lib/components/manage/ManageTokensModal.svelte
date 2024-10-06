<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { saveIcrcCustomTokens } from '$icp-eth/services/manage-tokens.services';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import ManageTokens from '$lib/components/manage/ManageTokens.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { Network } from '$lib/types/network';
	import { isNetworkIdICP } from '$lib/utils/network.utils';

	const steps: WizardSteps = [
		{
			name: 'Manage',
			title: $i18n.tokens.manage.text.title
		},
		{
			name: 'Import',
			title: $i18n.tokens.import.text.title
		},
		{
			name: 'Review',
			title: $i18n.tokens.import.text.review
		},
		{
			name: 'Saving',
			title: $i18n.tokens.import.text.saving
		}
	];

	let saveProgressStep: ProgressStepsAddToken = ProgressStepsAddToken.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const saveTokens = async ({ detail: { icrc } }: CustomEvent<{ icrc: IcrcCustomToken[] }>) => {
		if (icrc.length === 0) {
			toastsShow({
				text: $i18n.tokens.manage.info.no_changes,
				level: 'info',
				duration: 5000
			});

			return;
		}

		await Promise.allSettled([...(icrc.length > 0 ? [saveIcrc(icrc)] : [])]);
	};

	const addIcrcToken = async () => {
		if (isNullish(ledgerCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_ledger_id }
			});
			return;
		}

		if (isNullish(indexCanisterId)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.missing_index_id }
			});
			return;
		}

		await saveIcrc([
			{
				enabled: true,
				ledgerCanisterId,
				indexCanisterId
			}
		]);
	};

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const saveIcrc = (tokens: SaveCustomToken[]): Promise<void> =>
		saveIcrcCustomTokens({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authIdentity
		});

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
	};

	let ledgerCanisterId: string | undefined;
	let indexCanisterId: string | undefined;

	let network: Network | undefined;
	let tokenData: Partial<AddTokenData> = {};

	$: tokenData, ({ ledgerCanisterId, indexCanisterId } = tokenData);
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Saving'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		{#if isNetworkIdICP(network?.id)}
			<IcAddTokenReview
				on:icBack={modal.back}
				on:icSave={addIcrcToken}
				{ledgerCanisterId}
				{indexCanisterId}
			/>
		{/if}
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{:else if currentStep?.name === 'Import'}
		<AddTokenByNetwork on:icBack={modal.back} on:icNext={modal.next} bind:network bind:tokenData />
	{:else}
		<ManageTokens on:icClose={close} on:icAddToken={modal.next} on:icSave={saveTokens} />
	{/if}
</WizardModal>

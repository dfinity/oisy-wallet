<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import AddTokenReviewByNetwork from '$lib/components/manage/AddTokenReviewByNetwork.svelte';
	import ManageTokens from '$lib/components/manage/ManageTokens.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { MANAGE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isRouteNfts } from '$lib/utils/nav.utils';
	import { saveAllCustomTokens } from '$lib/utils/tokens.utils';

	interface Props {
		initialSearch?: string;
		onClose?: () => void;
		infoElement?: Snippet;
	}

	let { initialSearch, onClose = () => {}, infoElement }: Props = $props();

	const isNftsPage = $derived(isRouteNfts(page));

	const steps: WizardSteps<WizardStepsManageTokens> = $derived([
		{
			name: WizardStepsManageTokens.MANAGE,
			title: isNftsPage ? $i18n.tokens.manage.text.title_nft : $i18n.tokens.manage.text.title
		},
		{
			name: WizardStepsManageTokens.IMPORT,
			title: isNftsPage ? $i18n.tokens.import.text.title_nft : $i18n.tokens.import.text.title
		},
		{
			name: WizardStepsManageTokens.REVIEW,
			title: $i18n.tokens.import.text.review
		},
		{
			name: WizardStepsManageTokens.SAVING,
			title: $i18n.tokens.import.text.updating
		}
	]);

	let saveProgressStep: ProgressStepsAddToken = $state(ProgressStepsAddToken.INITIALIZATION);

	let currentStep: WizardStep<WizardStepsManageTokens> | undefined = $state();
	let modal: WizardModal<WizardStepsManageTokens> | undefined = $state();

	const saveTokens = async (tokens: Token[]) => {
		await saveAllCustomTokens({
			tokens,
			progress,
			modalNext: () => modal?.set(3),
			onSuccess: close,
			onError: () => modal?.set(0),
			$authIdentity,
			$i18n
		});
	};

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
		onClose();
	};

	let network: Network | undefined = $state($selectedNetwork);
	let tokenData: Partial<AddTokenData> = $state({});
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsManageTokens.SAVING}
	onClose={close}
	{steps}
	testId={MANAGE_TOKENS_MODAL}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsManageTokens.REVIEW}
			<AddTokenReviewByNetwork
				{isNftsPage}
				modalNext={() => modal?.set(3)}
				{network}
				onBack={modal.back}
				onError={() => modal?.set(0)}
				onSuccess={close}
				{progress}
				{tokenData}
			/>
		{:else if currentStep?.name === WizardStepsManageTokens.SAVING}
			<InProgressWizard
				progressStep={saveProgressStep}
				steps={addTokenSteps($i18n)}
				warningType="manage"
			/>
		{:else if currentStep?.name === WizardStepsManageTokens.IMPORT}
			<AddTokenByNetwork
				{isNftsPage}
				onBack={modal.back}
				onNext={modal.next}
				bind:network
				bind:tokenData
			/>
		{:else if currentStep?.name === WizardStepsManageTokens.MANAGE}
			<ManageTokens
				{infoElement}
				{initialSearch}
				{isNftsPage}
				onAddToken={modal.next}
				onSave={saveTokens}
			/>
		{/if}
	{/key}
</WizardModal>

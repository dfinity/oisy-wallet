<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import { getAddTokenDataIdentifier } from '$icp-eth/utils/add-token.utils';
	import AddTokenWizardSteps, {
		type AddTokenWizardStep
	} from '$lib/components/manage/AddTokenWizardSteps.svelte';
	import ManageTokens from '$lib/components/manage/ManageTokens.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { MANAGE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SOURCE_LOCATIONS
	} from '$lib/enums/plausible';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
	import { trackTokenManage } from '$lib/services/token-manage-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isRouteNfts } from '$lib/utils/nav.utils';
	import { saveAllCustomTokens } from '$lib/utils/tokens.utils';

	interface Props {
		initialSearch?: string;
		initialNetwork?: Network;
		initialTokenData?: Partial<AddTokenData>;
		initialStep?: WizardStepsManageTokens;
		onClose?: () => void;
		infoElement?: Snippet;
	}

	let {
		initialSearch,
		initialNetwork,
		initialTokenData,
		initialStep,
		onClose = () => {},
		infoElement
	}: Props = $props();

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

	const ADD_TOKEN_STEPS: Partial<Record<WizardStepsManageTokens, AddTokenWizardStep>> = {
		[WizardStepsManageTokens.IMPORT]: 'import',
		[WizardStepsManageTokens.REVIEW]: 'review',
		[WizardStepsManageTokens.SAVING]: 'saving'
	};

	let addTokenStep = $derived(
		nonNullish(currentStep) ? ADD_TOKEN_STEPS[currentStep.name] : undefined
	);
	let modal: WizardModal<WizardStepsManageTokens> | undefined = $state();
	let initializedInitialStep = false;

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

	const trackImportCancel = () => {
		if (
			currentStep?.name !== WizardStepsManageTokens.IMPORT &&
			currentStep?.name !== WizardStepsManageTokens.REVIEW
		) {
			return;
		}

		const address = getAddTokenDataIdentifier(tokenData);

		const tokenNetwork = network?.id.description;

		if (isNullishOrEmpty(address) || isNullish(tokenNetwork)) {
			return;
		}

		trackTokenManage({
			modifier: 'import',
			token: {
				network: tokenNetwork,
				address
			},
			sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.MANAGE_TOKENS,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.CANCEL
		});
	};

	const close = () => {
		trackImportCancel();

		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
		onClose();
	};

	const initialModalNetwork = (): Network | undefined => initialNetwork ?? $selectedNetwork;

	const initialModalTokenData = (): Partial<AddTokenData> => initialTokenData ?? {};

	let network: Network | undefined = $state(initialModalNetwork());
	let tokenData: Partial<AddTokenData> = $state(initialModalTokenData());

	$effect(() => {
		if (initializedInitialStep || isNullish(initialStep) || isNullish(modal)) {
			return;
		}

		initializedInitialStep = true;

		const stepIndex = steps.findIndex(({ name }) => name === initialStep);

		if (stepIndex >= 0) {
			modal.set(stepIndex);
		}
	});
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
		{#if nonNullish(addTokenStep)}
			<AddTokenWizardSteps
				{isNftsPage}
				onBack={modal.back}
				onBackToImport={modal.back}
				onError={() => modal?.set(0)}
				onReview={modal.next}
				onSaving={() => modal?.set(3)}
				onSuccess={close}
				step={addTokenStep}
				bind:network
				bind:progressStep={saveProgressStep}
				bind:tokenData
			/>
		{:else if currentStep?.name === WizardStepsManageTokens.MANAGE}
			<ManageTokens
				{infoElement}
				{initialSearch}
				{isNftsPage}
				onAddToken={modal.next}
				onSave={saveTokens}
				bind:network
			/>
		{/if}
	{/key}
</WizardModal>

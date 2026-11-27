<script lang="ts" module>
	export type AddTokenWizardStep = 'import' | 'review' | 'saving';
</script>

<script lang="ts">
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
	import AddTokenReviewByNetwork from '$lib/components/manage/AddTokenReviewByNetwork.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import type { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';

	interface Props {
		step: AddTokenWizardStep;
		network?: Network;
		tokenData: Partial<AddTokenData>;
		// Set by the review as it saves, and shown while saving.
		progressStep: ProgressStepsAddToken;
		isNftsPage?: boolean;
		fungibleOnly?: boolean;
		networkSelectable?: boolean;
		// Leaves the import form.
		onBack: () => void;
		onReview: () => void;
		onBackToImport: () => void;
		onSaving: () => void;
		onSuccess: () => void;
		onError: () => void;
	}

	let {
		step,
		network = $bindable(),
		tokenData = $bindable(),
		progressStep = $bindable(),
		isNftsPage,
		fungibleOnly,
		networkSelectable,
		onBack,
		onReview,
		onBackToImport,
		onSaving,
		onSuccess,
		onError
	}: Props = $props();
</script>

{#if step === 'import'}
	<AddTokenByNetwork
		{isNftsPage}
		{networkSelectable}
		{onBack}
		onNext={onReview}
		bind:network
		bind:tokenData
	/>
{:else if step === 'review'}
	<AddTokenReviewByNetwork
		{fungibleOnly}
		{isNftsPage}
		modalNext={onSaving}
		{network}
		onBack={onBackToImport}
		{onError}
		{onSuccess}
		progress={(next) => (progressStep = next)}
		{tokenData}
	/>
{:else}
	<InProgressWizard {progressStep} steps={addTokenSteps($i18n)} warningType="manage" />
{/if}

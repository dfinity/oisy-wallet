<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { IN_PROGRESS_MODAL } from '$lib/constants/test-ids.constants';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		progressStep?: string;
		steps: ProgressSteps;
		warningType?: 'transaction' | 'manage';
		failedSteps?: string[];
	}

	let {
		progressStep = ProgressStepsSend.INITIALIZATION,
		steps,
		warningType = 'transaction',
		failedSteps = []
	}: Props = $props();

	const startConfirmToClose = () => {
		dirtyWizardState.set(true);
		confirmToCloseBrowser(true);
	};
	const stopConfirmToClose = () => {
		dirtyWizardState.set(false);
		confirmToCloseBrowser(false);
	};

	onMount(startConfirmToClose);
	onDestroy(stopConfirmToClose);

	// Workaround: SvelteKit does not consistently call `onDestroy`. Various issues are open regarding this on Svelte side.
	// This is the simplest, least verbose solution to always disconnect before unload, given that this component is used in `<WizardModal />` only.
	$effect(() => {
		void $dirtyWizardState;

		if (nonNullish($modalStore)) {
			return;
		}

		stopConfirmToClose();
	});
</script>

<div class="stretch" data-tid={IN_PROGRESS_MODAL}>
	<MessageBox level="warning">
		<span>
			{replaceOisyPlaceholders(
				warningType === 'manage'
					? $i18n.tokens.import.warning.do_not_close_manage
					: $i18n.core.warning.do_not_close
			)}
		</span>
	</MessageBox>

	<InProgress {failedSteps} {progressStep} {steps} />
</div>

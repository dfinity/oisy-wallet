<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';

	export let progressStep: string = ProgressStepsSend.INITIALIZATION;
	export let steps: ProgressSteps;

	onMount(() => confirmToCloseBrowser(true));
	onDestroy(() => confirmToCloseBrowser(false));

	// Workaround: SvelteKit does not consistently call `onDestroy`. Various issues are open regarding this on Svelte side.
	// This is the simplest, least verbose solution to always disconnect before unload, given that this component is used in `<WizardModal />` only.
	$: $modalStore,
		(() => {
			if (nonNullish($modalStore)) {
				return;
			}

			confirmToCloseBrowser(false);
		})();
</script>

<div class="stretch">
	<MessageBox level="light-warning">
		<span>{$i18n.core.warning.do_not_close}</span>
	</MessageBox>

	<InProgress {progressStep} {steps} />
</div>

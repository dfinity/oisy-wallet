<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';
	import { IN_PROGESS_MODAL } from '$lib/constants/test-ids.constants';

	export let progressStep: string = ProgressStepsSend.INITIALIZATION;
	export let steps: [ProgressStep, ...ProgressStep[]];

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

<div class="stretch" data-tid={IN_PROGESS_MODAL}>
	<Warning>
		<span>{$i18n.core.warning.may_take_a_few_seconds}</span>
		<br />
		<span>{$i18n.core.warning.do_not_close}</span>
	</Warning>

	<InProgress {progressStep} {steps} />
</div>

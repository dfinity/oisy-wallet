<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { onDestroy, onMount } from 'svelte';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';

	export let progressStep: string = SendStep.INITIALIZATION;
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

<div class="stretch">
	<Warning>
		<p>This may take a few seconds.</p>
		<p>Please do not close your browser tab.</p>
	</Warning>

	<InProgress {progressStep} {steps} />
</div>

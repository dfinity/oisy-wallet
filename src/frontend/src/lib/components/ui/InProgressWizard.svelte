<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { onDestroy, onMount } from 'svelte';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';
	import { IconWarning } from '@dfinity/gix-components';

	export let progressStep: string = SendStep.INITIALIZATION;
	export let steps: [ProgressStep, ...ProgressStep[]];

	onMount(() => confirmToCloseBrowser(true));
	onDestroy(() => confirmToCloseBrowser(false));
</script>

<div class="bg-blue text-off-white rounded-lg p-4 mb-4 flex gap-2">
	<IconWarning size="44px" />
	<div>
		<p class="value">This may take a few seconds.</p>
		<p class="description">Please do not close your browser tab.</p>
	</div>
</div>

<InProgress {progressStep} {steps} />

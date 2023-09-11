<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { SendStep } from '$lib/enums/send';
	import { onDestroy, onMount } from 'svelte';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';
	import { IconWarning } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';

	export let progressStep: string = SendStep.INITIALIZATION;
	export let additionalSteps: ProgressStep[] | undefined = undefined;

	let steps: [ProgressStep, ...ProgressStep[]] = [
		{
			step: SendStep.INITIALIZATION,
			text: 'Initializing transaction...',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: SendStep.SIGN,
			text: 'Signing transaction...',
			state: 'next'
		} as ProgressStep,
		{
			step: SendStep.SEND,
			text: 'Sending...',
			state: 'next'
		} as ProgressStep,
		...(nonNullish(additionalSteps) ? additionalSteps : [])
	];

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

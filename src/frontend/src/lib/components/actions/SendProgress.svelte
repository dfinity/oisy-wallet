<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { SendStep } from '$lib/enums/send';
	import { onDestroy, onMount } from 'svelte';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';

	export let progressStep: string = SendStep.INITIALIZATION;
	let steps: [ProgressStep, ...ProgressStep[]] = [
		{
			step: SendStep.INITIALIZATION,
			text: 'Initializing transaction...',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: SendStep.SIGN,
			text: 'Sign-in transaction...',
			state: 'next'
		} as ProgressStep,
		{
			step: SendStep.SEND,
			text: 'Sending...',
			state: 'next'
		} as ProgressStep
	];

	onMount(() => confirmToCloseBrowser(true));
	onDestroy(() => confirmToCloseBrowser(false));
</script>

<InProgress {progressStep} {steps} />

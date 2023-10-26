<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { onDestroy, onMount } from 'svelte';
	import { confirmToCloseBrowser } from '$lib/utils/before-unload.utils';
	import Warning from '$lib/components/ui/Warning.svelte';

	export let progressStep: string = SendStep.INITIALIZATION;
	export let steps: [ProgressStep, ...ProgressStep[]];

	onMount(() => confirmToCloseBrowser(true));
	onDestroy(() => confirmToCloseBrowser(false));
</script>

<Warning>
	<p>This may take a few seconds.</p>
	<p>Please do not close your browser tab.</p>
</Warning>

<InProgress {progressStep} {steps} />

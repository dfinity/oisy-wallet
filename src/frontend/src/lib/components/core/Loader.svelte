<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import { LoaderStep } from '$lib/enums/loader';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { onMount } from 'svelte';
	import { loadAddress } from '$lib/services/address.services';
	import { toasts } from '$lib/stores/toasts.store';
	import { loadBalance } from '$lib/services/balance.services';
	import { loadTransactions } from '$lib/services/transactions.services';
	import { fade } from 'svelte/transition';

	let progressStep: string = LoaderStep.ETH_ADDRESS;
	let steps: [ProgressStep, ...ProgressStep[]] = [
		{
			step: LoaderStep.INITIALIZATION,
			text: 'Connected with Internet Identity - a decentralized castody solution',
			state: 'completed'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_ADDRESS,
			text: 'Loading ETH address...',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: LoaderStep.BALANCE,
			text: 'Loading your wallet balance...',
			state: 'next'
		} as ProgressStep,
		{
			step: LoaderStep.TRANSACTIONS,
			text: 'And its transactions...',
			state: 'next'
		} as ProgressStep
	];

	onMount(async () => {
		try {
			await loadAddress();

			progressStep = LoaderStep.BALANCE;

			await loadBalance();

			progressStep = LoaderStep.TRANSACTIONS;

			await loadTransactions();

			progressStep = LoaderStep.DONE;
		} catch (err: unknown) {
			console.error(err);

			toasts.error({
				text: `Something went wrong while loading the data.`,
				detail: err
			});
		}
	});
</script>

{#if progressStep !== LoaderStep.DONE}
	<InProgress {progressStep} {steps} />
{:else}
	<div transition:fade>
		<slot />
	</div>
{/if}

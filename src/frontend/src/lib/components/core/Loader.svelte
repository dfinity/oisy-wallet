<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import { LoaderStep } from '$lib/enums/loader';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { onMount } from 'svelte';
	import { loadAddress } from '$lib/services/address.services';
	import { loadBalances } from '$lib/services/balance.services';
	import { fade } from 'svelte/transition';
	import { signOut } from '$lib/services/auth.services';
	import { loadErc20Contracts } from '$lib/services/erc20.services';
	import { loadEthTransactions } from '$lib/services/transactions.services';

	let progressStep: string = LoaderStep.ETH_ADDRESS;
	let steps: [ProgressStep, ...ProgressStep[]] = [
		{
			step: LoaderStep.INITIALIZATION,
			text: 'Connected with a decentralised custody solution - Internet Identity',
			state: 'completed'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_ADDRESS,
			text: 'Getting ETH address from the canister',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: LoaderStep.ERC20_CONTRACTS,
			text: 'Initialising ERC20 metadata',
			state: 'next'
		} as ProgressStep,
		{
			step: LoaderStep.BALANCE,
			text: 'Loading your wallet balance',
			state: 'next'
		} as ProgressStep
	];

	onMount(async () => {
		const { success: addressSuccess } = await loadAddress();

		if (!addressSuccess) {
			await signOut();
			return;
		}

		progressStep = LoaderStep.ERC20_CONTRACTS;

		await loadErc20Contracts();

		progressStep = LoaderStep.BALANCE;

		const { success: balanceSuccess } = await loadBalances();

		if (!balanceSuccess) {
			await signOut();
			return;
		}

		progressStep = LoaderStep.DONE;
	});
</script>

{#if progressStep !== LoaderStep.DONE}
	<InProgress {progressStep} {steps} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}

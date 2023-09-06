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
	import banner from '$lib/assets/banner.svg';
	import { Modal } from '@dfinity/gix-components';
	import Img from '$lib/components/ui/Img.svelte';

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
	<Modal>
		<Img width="100%" src={banner} />

		<h3 class="my-3">Setting up your wallet with Chain-Key Cryptography...</h3>

		<InProgress {progressStep} {steps} />
	</Modal>
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}

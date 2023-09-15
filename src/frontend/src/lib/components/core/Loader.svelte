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
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import { tokenId } from '$lib/derived/token.derived';
	import { loadTransactions as loadTransactionsServices } from '$lib/services/transactions.services';
	import { browser } from '$app/environment';
	import { isNullish } from '@dfinity/utils';

	let progressStep: string = LoaderStep.ETH_ADDRESS;

	let loadTransactions = false;
	$: loadTransactions = isRouteTransactions($page);

	let steps: [ProgressStep, ...ProgressStep[]]
	$: steps = [
		{
			step: LoaderStep.INITIALIZATION,
			text: 'Creating a secure session with Internet Identity',
			state: 'completed'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_ADDRESS,
			text: 'Setting up Ethereum <> Internet Computer communication',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_DATA,
			text: `Fetching token balances${loadTransactions ? " and transactions" : ""}`,
			state: 'next'
		} as ProgressStep
	];

	let inProgress = true;
	$: (() => {
		if (progressStep !== LoaderStep.DONE) {
			return;
		}

		if (confirm) {
			return;
		}

		// A small delay for display animation purpose.
		setTimeout(() => (inProgress = false), 1000);
	})();

	const { oisy_introduction }: Storage = browser
		? localStorage
		: ({ oisy_introduction: null } as unknown as Storage);
	const confirm = isNullish(oisy_introduction);

	let disabledConfirm = true;
	$: disabledConfirm = progressStep !== LoaderStep.DONE;

	onMount(async () => {
		const { success: addressSuccess } = await loadAddress();

		if (!addressSuccess) {
			await signOut();
			return;
		}

		progressStep = LoaderStep.ETH_DATA;

		await loadErc20Contracts();

		const { success: balanceSuccess } = await loadBalances();

		if (!balanceSuccess) {
			await signOut();
			return;
		}

		if (loadTransactions) {
			const { success: transactionsSuccess } = await loadTransactionsServices($tokenId);

			if (!transactionsSuccess) {
				await signOut();
				return;
			}
		}

		progressStep = LoaderStep.DONE;
	});

	const confirmIntroduction = () => {
		localStorage.setItem('oisy_introduction', 'done');
		inProgress = false;
	};
</script>

{#if inProgress}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal>
			<Img width="100%" src={banner} />

			<h3 class="my-3">Initializing the wallet with Chain-Key cryptography...</h3>

			<InProgress {progressStep} {steps} />

			{#if confirm}
				<button
					on:click={confirmIntroduction}
					class="primary full center mt-3"
					disabled={disabledConfirm}
					class:opacity-0={disabledConfirm}>Let's go!</button
				>
			{/if}
		</Modal>
	</div>
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}

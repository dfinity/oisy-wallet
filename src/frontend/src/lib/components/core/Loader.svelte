<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import { LoaderStep } from '$lib/enums/loader';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { onMount } from 'svelte';
	import { loadAddress } from '$lib/services/address.services';
	import { fade } from 'svelte/transition';
	import { signOut } from '$lib/services/auth.services';
	import { loadErc20Contracts } from '$lib/services/erc20.services';
	import banner from '$lib/assets/banner.svg';
	import { Modal } from '@dfinity/gix-components';
	import Img from '$lib/components/ui/Img.svelte';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { isNullish } from '@dfinity/utils';
	import { initAirdrop } from '$lib/services/airdrop.services';
	import { loadEthData } from '$lib/services/loader.services';
	import { tokenId } from '$lib/derived/token.derived';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import {loading} from "$lib/stores/loader.store";

	let progressStep: string = LoaderStep.ETH_ADDRESS;

	let loadTransactions = false;
	$: loadTransactions = isRouteTransactions($page);

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: LoaderStep.INITIALIZATION,
			text: 'Securing session with Internet Identity',
			state: 'completed'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_ADDRESS,
			text: 'Retrieving your Ethereum public key',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_DATA,
			text: `Fetching token balances${loadTransactions ? ' and transactions' : ''}`,
			state: 'next'
		} as ProgressStep
	];

	$: (() => {
		if (progressStep !== LoaderStep.DONE) {
			return;
		}

		if (confirm) {
			return;
		}

		// A small delay for display animation purpose.
		setTimeout(() => (loading.set(false)), 1000);
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

		// Load Erc20 contracts before loading balances and transactions
		await loadErc20Contracts();

		// In case of error we want to display the dapp anyway and not get stuck on the loader
		await Promise.allSettled([
			loadEthData({ loadTransactions, tokenId: $tokenId }),
			...(AIRDROP ? [initAirdrop()] : [])
		]);

		progressStep = LoaderStep.DONE;
	});

	const confirmIntroduction = () => {
		localStorage.setItem('oisy_introduction', 'done');
		loading.set(false);
	};
</script>

{#if $loading}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal>
			<div
				style="min-height: calc((var(--dialog-width) - (2 * var(--dialog-padding-x)) - (2 * var(--padding-2x))) * (114 / 332))"
			>
				<Img width="100%" src={banner} />
			</div>

			<h3 class="my-3">Initializing your wallet</h3>

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

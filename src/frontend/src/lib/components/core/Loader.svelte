<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { onMount } from 'svelte';
	import { loadAddress, loadIdbAddress } from '$lib/services/address.services';
	import { fade } from 'svelte/transition';
	import { signOut } from '$lib/services/auth.services';
	import { loadErc20Contracts } from '$eth/services/erc20.services';
	import banner from '$lib/assets/banner.svg';
	import { Modal } from '@dfinity/gix-components';
	import Img from '$lib/components/ui/Img.svelte';
	import { browser } from '$app/environment';
	import { isNullish } from '@dfinity/utils';
	import { loading } from '$lib/stores/loader.store';
	import { LoaderStep } from '$lib/enums/steps';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
	import { i18n } from '$lib/stores/i18n.store';

	let progressStep: string = LoaderStep.ETH_ADDRESS;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: LoaderStep.INITIALIZATION,
			text: $i18n.init.text.securing_session,
			state: 'completed'
		} as ProgressStep,
		{
			step: LoaderStep.ETH_ADDRESS,
			text: $i18n.init.text.retrieving_eth_key,
			state: 'in_progress'
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
		setTimeout(() => loading.set(false), 1000);
	})();

	const { oisy_introduction }: Storage = browser
		? localStorage
		: ({ oisy_introduction: null } as unknown as Storage);
	const confirm = isNullish(oisy_introduction);

	let disabledConfirm = true;
	$: disabledConfirm = progressStep !== LoaderStep.DONE;

	const loadData = async () => {
		// Load Erc20 contracts and ICRC metadata before loading balances and transactions
		await Promise.all([loadErc20Contracts(), loadIcrcTokens()]);
	};

	const progressAndLoad = async () => {
		progressStep = LoaderStep.DONE;

		// Once the address initialized, we load the data without displaying a progress step.
		// Instead, we use effect, placeholders and skeleton until those data are loaded.
		await loadData();
	};

	let progressModal = false;

	onMount(async () => {
		const { success: addressIdbSuccess } = await loadIdbAddress();

		if (addressIdbSuccess) {
			loading.set(false);

			await progressAndLoad();

			return;
		}

		// We are loading the ETH address from the backend. Consequently, we aim to animate this operation and offer the user an explanation of what is happening. To achieve this, we will present this information within a modal.
		progressModal = true;

		const { success: addressSuccess } = await loadAddress();

		if (!addressSuccess) {
			await signOut();
			return;
		}

		await progressAndLoad();
	});

	const confirmIntroduction = () => {
		localStorage.setItem('oisy_introduction', 'done');
		loading.set(false);
	};
</script>

{#if $loading}
	{#if progressModal}
		<div in:fade={{ delay: 0, duration: 250 }}>
			<Modal>
				<div
					style="min-height: calc((var(--dialog-width) - (2 * var(--dialog-padding-x)) - (2 * var(--padding-2x))) * (114 / 332))"
				>
					<Img width="100%" src={banner} />
				</div>

				<h3 class="my-3">{$i18n.init.text.initializing_wallet}</h3>

				<InProgress {progressStep} {steps} />

				{#if confirm}
					<button
						on:click={confirmIntroduction}
						class="primary full center mt-6"
						disabled={disabledConfirm}
						class:opacity-0={disabledConfirm}>{$i18n.init.text.lets_go}</button
					>
				{/if}
			</Modal>
		</div>
	{/if}
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}

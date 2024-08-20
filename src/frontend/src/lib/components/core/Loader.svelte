<script lang="ts">
	import { Modal, type ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { onMount } from 'svelte';
	import { safeLoadBtcAddressMainnet, safeLoadEthAddress } from '$lib/services/address.services';
	import { fade } from 'svelte/transition';
	import { signOut } from '$lib/services/auth.services';
	import { loadErc20Tokens } from '$eth/services/erc20.services';
	import banner from '$lib/assets/banner.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { loading } from '$lib/stores/loader.store';
	import { ProgressStepsLoader } from '$lib/enums/progress-steps';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { authStore } from '$lib/stores/auth.store';
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';

	let progressStep: string = ProgressStepsLoader.BTC_ETH_ADDRESS;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: ProgressStepsLoader.INITIALIZATION,
			text: $i18n.init.text.securing_session,
			state: 'completed'
		} as ProgressStep,
		{
			step: ProgressStepsLoader.BTC_ETH_ADDRESS,
			text: $i18n.init.text.retrieving_public_keys,
			state: 'in_progress'
		} as ProgressStep
	];

	$: (() => {
		if (progressStep !== ProgressStepsLoader.DONE) {
			return;
		}

		// A small delay for display animation purpose.
		setTimeout(() => loading.set(false), 1000);
	})();

	const loadData = async () => {
		// Load Erc20 contracts and ICRC metadata before loading balances and transactions
		await Promise.all([
			loadErc20Tokens({
				identity: $authStore.identity
			}),
			loadIcrcTokens({
				identity: $authStore.identity
			})
		]);
	};

	const progressAndLoad = async () => {
		progressStep = ProgressStepsLoader.DONE;

		// Once the address initialized, we load the data without displaying a progress step.
		// Instead, we use effect, placeholders and skeleton until those data are loaded.
		await loadData();
	};

	let progressModal = false;

	// We are loading the BTC and ETH address from the backend. Consequently, we aim to animate this operation and offer the user an explanation of what is happening. To achieve this, we will present this information within a modal.
	const displayProgressModal = () => {
		if (!progressModal) {
			progressModal = true;
		}
	};

	let idbBtcMainnetSuccess = false;
	let idbEthSuccess = false;

	$: {
		if ($loading && idbBtcMainnetSuccess && idbEthSuccess) {
			loading.set(false);
		}
	}

	onMount(async () => {
		const results = await Promise.all([
			NETWORK_BITCOIN_ENABLED
				? safeLoadBtcAddressMainnet({
						displayProgressModal,
						onIdbSuccess: () => (idbBtcMainnetSuccess = true)
					})
				: Promise.resolve({ success: true }),
			safeLoadEthAddress({ displayProgressModal, onIdbSuccess: () => (idbEthSuccess = true) })
		]);

		if (results.every(({ success }) => success)) {
			await progressAndLoad();

			return;
		}

		await signOut();
	});
</script>

{#if $loading}
	{#if progressModal}
		<div in:fade={{ delay: 0, duration: 250 }}>
			<Modal>
				<div class="stretch">
					<div
						style="min-height: calc((var(--dialog-width) - (2 * var(--dialog-padding-x)) - (2 * var(--padding-2x))) * (114 / 332))"
					>
						<Img width="100%" src={banner} />
					</div>

					<h3 class="my-3">{$i18n.init.text.initializing_wallet}</h3>

					<InProgress {progressStep} {steps} />
				</div>
			</Modal>
		</div>
	{/if}
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}

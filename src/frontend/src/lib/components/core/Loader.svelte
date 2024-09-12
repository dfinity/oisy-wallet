<script lang="ts">
	import { Modal, type ProgressStep } from '@dfinity/gix-components';
	import { debounce, isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { loadErc20Tokens } from '$eth/services/erc20.services';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
	import banner from '$lib/assets/banner.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { btcAddressTestnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { ProgressStepsLoader } from '$lib/enums/progress-steps';
	import {
		loadAddresses,
		loadBtcAddressTestnet,
		loadIdbAddresses
	} from '$lib/services/address.services';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { loading } from '$lib/stores/loader.store';

	let progressStep: string = ProgressStepsLoader.ADDRESSES;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: ProgressStepsLoader.INITIALIZATION,
			text: $i18n.init.text.securing_session,
			state: 'completed'
		} as ProgressStep,
		{
			step: ProgressStepsLoader.ADDRESSES,
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
				identity: $authIdentity
			}),
			loadIcrcTokens({
				identity: $authIdentity
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

	const debounceLoadBtcAddressTestnet = debounce(loadBtcAddressTestnet);

	$: {
		if ($testnets && isNullish($btcAddressTestnet)) {
			debounceLoadBtcAddressTestnet();
		}
	}

	onMount(async () => {
		const { success: addressIdbSuccess, err } = await loadIdbAddresses();

		if (addressIdbSuccess) {
			loading.set(false);

			await progressAndLoad();

			return;
		}

		// We are loading the addresses from the backend. Consequently, we aim to animate this operation and offer the user an explanation of what is happening. To achieve this, we will present this information within a modal.
		progressModal = true;

		const { success: addressSuccess } = await loadAddresses(
			err?.map(({ tokenId }) => tokenId) ?? []
		);

		if (!addressSuccess) {
			await signOut();
			return;
		}

		await progressAndLoad();
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

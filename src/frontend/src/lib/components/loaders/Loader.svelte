<script lang="ts">
	import { Modal, type ProgressStep } from '@dfinity/gix-components';
	import { debounce, isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { loadBtcAddressRegtest, loadBtcAddressTestnet } from '$btc/services/btc-address.services';
	import { SOLANA_NETWORK_ENABLED } from '$env/networks/networks.sol.env';
	import { loadErc20Tokens } from '$eth/services/erc20.services';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
	import banner from '$lib/assets/banner.svg';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
	import {
		btcAddressRegtest,
		btcAddressTestnet,
		solAddressDevnet,
		solAddressLocal,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { ProgressStepsLoader } from '$lib/enums/progress-steps';
	import { loadAddresses, loadIdbAddresses } from '$lib/services/addresses.services';
	import { signOut } from '$lib/services/auth.services';
	import { initSignerAllowance } from '$lib/services/loader.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { loading } from '$lib/stores/loader.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { emit } from '$lib/utils/events.utils';
	import {
		loadSolAddressDevnet,
		loadSolAddressLocal,
		loadSolAddressTestnet
	} from '$sol/services/sol-address.services';

	let progressStep: string = ProgressStepsLoader.ADDRESSES;

	let steps: ProgressSteps;
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
	const debounceLoadBtcAddressRegtest = debounce(loadBtcAddressRegtest);

	const debounceLoadSolAddressTestnet = debounce(loadSolAddressTestnet);
	const debounceLoadSolAddressDevnet = debounce(loadSolAddressDevnet);
	const debounceLoadSolAddressLocal = debounce(loadSolAddressLocal);

	$: {
		if ($testnets) {
			if (isNullish($btcAddressTestnet)) {
				debounceLoadBtcAddressTestnet();
			}

			if (SOLANA_NETWORK_ENABLED) {
				if (isNullish($solAddressTestnet)) {
					debounceLoadSolAddressTestnet();
				}

				if (isNullish($solAddressDevnet)) {
					debounceLoadSolAddressDevnet();
				}
			}

			if (LOCAL) {
				if (isNullish($btcAddressRegtest)) {
					debounceLoadBtcAddressRegtest();
				}

				if (isNullish($solAddressLocal) && SOLANA_NETWORK_ENABLED) {
					debounceLoadSolAddressLocal();
				}
			}
		}
	}

	const validateAddresses = () => emit({ message: 'oisyValidateAddresses' });

	onMount(async () => {
		const { success: addressIdbSuccess, err } = await loadIdbAddresses();

		if (addressIdbSuccess) {
			loading.set(false);

			await progressAndLoad();

			validateAddresses();

			return;
		}

		// We are loading the addresses from the backend. Consequently, we aim to animate this operation and offer the user an explanation of what is happening. To achieve this, we will present this information within a modal.
		progressModal = true;

		const { success: initSignerAllowanceSuccess } = await initSignerAllowance();

		if (!initSignerAllowanceSuccess) {
			// Sign-out is handled within the service.
			return;
		}

		const { success: addressSuccess } = await loadAddresses(
			err?.map(({ tokenId }) => tokenId) ?? []
		);

		if (!addressSuccess) {
			await signOut({});
			return;
		}

		await progressAndLoad();
	});
</script>

{#if $loading}
	{#if progressModal}
		<div in:fade={{ delay: 0, duration: 250 }} class="login-modal">
			<Modal testId={LOADER_MODAL}>
				<div class="stretch">
					<div class="mb-8 block">
						<ImgBanner src={banner} styleClass="aspect-auto" />
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

<style>
	:root:has(.login-modal) {
		--alert-max-width: 90vw;
		--alert-max-height: initial;
		--dialog-border-radius: calc(var(--border-radius-sm) * 3);
	}
</style>

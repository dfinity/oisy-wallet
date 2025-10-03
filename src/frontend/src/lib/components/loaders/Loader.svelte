<script lang="ts">
	import { Modal, themeStore } from '@dfinity/gix-components';
	import { debounce, isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		loadBtcAddressMainnet,
		loadBtcAddressRegtest,
		loadBtcAddressTestnet
	} from '$btc/services/btc-address.services';
	import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
	import { loadEthAddress } from '$eth/services/eth-address.services';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress,
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		networkBitcoinMainnetEnabled,
		networkBitcoinRegtestEnabled,
		networkBitcoinTestnetEnabled,
		networkEthereumEnabled,
		networkEvmMainnetEnabled,
		networkEvmTestnetEnabled,
		networkSepoliaEnabled,
		networkSolanaDevnetEnabled,
		networkSolanaLocalEnabled,
		networkSolanaMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { ProgressStepsLoader } from '$lib/enums/progress-steps';
	import { initLoader } from '$lib/services/loader.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { initialLoading } from '$lib/stores/loader.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { emit } from '$lib/utils/events.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		loadSolAddressDevnet,
		loadSolAddressLocal,
		loadSolAddressMainnet
	} from '$sol/services/sol-address.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let progressStep = $state<ProgressStepsLoader>(ProgressStepsLoader.ADDRESSES);

	let steps = $derived<ProgressSteps>([
		{
			step: ProgressStepsLoader.INITIALIZATION,
			text: $i18n.init.text.securing_session,
			state: 'completed'
		},
		{
			step: ProgressStepsLoader.ADDRESSES,
			text: $i18n.init.text.retrieving_public_keys,
			state: 'in_progress'
		},
		{
			step: ProgressStepsLoader.DONE,
			text: replaceOisyPlaceholders($i18n.init.text.done),
			state: 'completed'
		}
	]);

	$effect(() => {
		if (progressStep !== ProgressStepsLoader.DONE) {
			return;
		}

		// A small delay for display animation purpose.
		setTimeout(() => initialLoading.set(false), 1000);
	});

	let progressDone = $derived(progressStep === ProgressStepsLoader.DONE);

	const progressAndLoad = () => {
		progressStep = ProgressStepsLoader.DONE;
	};

	let progressModal = $state(false);

	const debounceLoadEthAddress = debounce(loadEthAddress);

	const debounceLoadBtcAddressMainnet = debounce(loadBtcAddressMainnet);
	const debounceLoadBtcAddressTestnet = debounce(loadBtcAddressTestnet);
	const debounceLoadBtcAddressRegtest = debounce(loadBtcAddressRegtest);

	const debounceLoadSolAddressMainnet = debounce(loadSolAddressMainnet);
	const debounceLoadSolAddressDevnet = debounce(loadSolAddressDevnet);
	const debounceLoadSolAddressLocal = debounce(loadSolAddressLocal);

	$effect(() => {
		if (progressDone) {
			if (($networkEthereumEnabled || $networkEvmMainnetEnabled) && isNullish($ethAddress)) {
				debounceLoadEthAddress();
			}

			if ($networkBitcoinMainnetEnabled && isNullish($btcAddressMainnet)) {
				debounceLoadBtcAddressMainnet();
			}

			if ($networkSolanaMainnetEnabled && isNullish($solAddressMainnet)) {
				debounceLoadSolAddressMainnet();
			}

			if ($testnetsEnabled) {
				if (($networkSepoliaEnabled || $networkEvmTestnetEnabled) && isNullish($ethAddress)) {
					debounceLoadEthAddress();
				}

				if ($networkBitcoinTestnetEnabled && isNullish($btcAddressTestnet)) {
					debounceLoadBtcAddressTestnet();
				}

				if ($networkSolanaDevnetEnabled && isNullish($solAddressDevnet)) {
					debounceLoadSolAddressDevnet();
				}

				if (LOCAL) {
					if ($networkBitcoinRegtestEnabled && isNullish($btcAddressRegtest)) {
						debounceLoadBtcAddressRegtest();
					}

					if ($networkSolanaLocalEnabled && isNullish($solAddressLocal)) {
						debounceLoadSolAddressLocal();
					}
				}
			}
		}
	});

	const validateAddresses = () => emit({ message: 'oisyValidateAddresses' });

	const setProgressModal = (value: boolean) => {
		progressModal = value;
	};

	onMount(async () => {
		await initLoader({
			identity: $authIdentity,
			validateAddresses,
			progressAndLoad,
			setProgressModal
		});
	});
</script>

{#if $initialLoading && !FRONTEND_DERIVATION_ENABLED}
	{#if progressModal}
		<div class="login-modal" in:fade={{ delay: 0, duration: 250 }}>
			<Modal testId={LOADER_MODAL}>
				<div class="stretch">
					<div class="mb-8 block">
						{#await import(`$lib/assets/banner-${$themeStore ?? 'light'}.svg`) then { default: src }}
							<ImgBanner
								alt={replacePlaceholders(replaceOisyPlaceholders($i18n.init.alt.loader_banner), {
									$theme: $themeStore ?? 'light'
								})}
								{src}
								styleClass="aspect-auto"
							/>
						{/await}
					</div>

					<h3 class="my-3">{$i18n.init.text.initializing_wallet}</h3>

					<InProgress {progressStep} {steps} />
				</div>
			</Modal>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}

<style lang="scss">
	:root:has(:global(.login-modal)) {
		--alert-max-width: 90vw;
		--alert-max-height: initial;
		--dialog-border-radius: calc(var(--border-radius-sm) * 3);
	}
</style>

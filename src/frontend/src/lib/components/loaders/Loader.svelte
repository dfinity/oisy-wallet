<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import {
		loadBtcAddressMainnet,
		loadBtcAddressRegtest,
		loadBtcAddressTestnet
	} from '$btc/services/btc-address.services';
	import { loadEthAddress } from '$eth/services/eth-address.services';
	import { LOCAL } from '$lib/constants/app.constants';
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
	import { initialLoading } from '$lib/stores/loader.store';
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

	onMount(async () => {
		await initLoader({
			identity: $authIdentity,
			progressAndLoad
		});
	});
</script>

{@render children()}

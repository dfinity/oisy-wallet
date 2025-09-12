<script lang="ts">
	import { Modal, themeStore } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		loadBtcAddressMainnet,
		loadBtcAddressRegtest,
		loadBtcAddressTestnet
	} from '$btc/services/btc-address.services';
	import { NFTS_ENABLED } from '$env/nft.env';
	import {
		erc1155CustomTokensInitialized,
		erc1155CustomTokensNotInitialized
	} from '$eth/derived/erc1155.derived';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import {
		erc721CustomTokensInitialized,
		erc721CustomTokensNotInitialized
	} from '$eth/derived/erc721.derived';
	import { loadErc1155Tokens } from '$eth/services/erc1155.services';
	import { loadErc20Tokens } from '$eth/services/erc20.services';
	import { loadErc721Tokens } from '$eth/services/erc721.services';
	import { loadEthAddress } from '$eth/services/eth-address.services';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
	import LoaderCollections from '$lib/components/loaders/LoaderCollections.svelte';
	import LoaderNfts from '$lib/components/loaders/LoaderNfts.svelte';
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
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { ProgressStepsLoader } from '$lib/enums/progress-steps';
	import { initLoader } from '$lib/services/loader.services';
	import { loadNfts } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { loading } from '$lib/stores/loader.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { emit } from '$lib/utils/events.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { splCustomTokensNotInitialized } from '$sol/derived/spl.derived';
	import {
		loadSolAddressDevnet,
		loadSolAddressLocal,
		loadSolAddressMainnet
	} from '$sol/services/sol-address.services';
	import { loadSplTokens } from '$sol/services/spl.services';

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
		setTimeout(() => loading.set(false), 1000);
	});

	let progressDone = $derived(progressStep === ProgressStepsLoader.DONE);

	let loadErc = $derived(
		$networkEthereumEnabled ||
			$networkEvmMainnetEnabled ||
			($testnetsEnabled && ($networkSepoliaEnabled || $networkEvmTestnetEnabled))
	);

	let loadErc20 = $derived(loadErc && $erc20UserTokensNotInitialized);

	let loadErc721 = $derived(loadErc && $erc721CustomTokensNotInitialized);

	let loadErc1155 = $derived(loadErc && $erc1155CustomTokensNotInitialized);

	let loadSpl = $derived(
		($networkSolanaMainnetEnabled ||
			($testnetsEnabled &&
				($networkSolanaDevnetEnabled || (LOCAL && $networkSolanaLocalEnabled)))) &&
			$splCustomTokensNotInitialized
	);

	const loadData = async () => {
		// Load Erc20 and Erc721 contracts and ICRC metadata before loading balances and transactions
		await Promise.all([
			...(loadErc20 ? [loadErc20Tokens({ identity: $authIdentity })] : []),
			...(loadErc721 ? [loadErc721Tokens({ identity: $authIdentity })] : []),
			...(loadErc1155 ? [loadErc1155Tokens({ identity: $authIdentity })] : []),
			loadIcrcTokens({ identity: $authIdentity }),
			...(loadSpl ? [loadSplTokens({ identity: $authIdentity })] : [])
		]);
	};

	$effect(() => {
		if (loadErc20 && progressDone) {
			loadErc20Tokens({ identity: $authIdentity });
		}
	});

	$effect(() => {
		if (loadErc721 && progressDone) {
			loadErc721Tokens({ identity: $authIdentity });
		}
	});

	$effect(() => {
		if (loadErc1155 && progressDone) {
			loadErc1155Tokens({ identity: $authIdentity });
		}
	});

	$effect(() => {
		if (loadSpl && progressDone) {
			loadSplTokens({ identity: $authIdentity });
		}
	});

	const progressAndLoad = async () => {
		progressStep = ProgressStepsLoader.DONE;

		// Once the address initialised, we load the data without displaying a progress step.
		// Instead, we use effect, placeholders and skeleton until those data are loaded.
		await loadData();
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

	const debounceLoadNfts = debounce(async () => {
		await loadNfts({
			tokens: $nonFungibleTokens ?? [],
			loadedNfts: $nftStore ?? [],
			walletAddress: $ethAddress
		});
	}, 1000);

	$effect(() => {
		if (
			NFTS_ENABLED &&
			($erc721CustomTokensInitialized || $erc1155CustomTokensInitialized) &&
			nonNullish($ethAddress) &&
			$nonFungibleTokens.length > 0
		) {
			debounceLoadNfts();
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

{#if $loading}
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
	<div in:fade>
		<LoaderCollections>
			<LoaderNfts>
				{@render children()}
			</LoaderNfts>
		</LoaderCollections>
	</div>
{/if}

<style lang="scss">
	:root:has(:global(.login-modal)) {
		--alert-max-width: 90vw;
		--alert-max-height: initial;
		--dialog-border-radius: calc(var(--border-radius-sm) * 3);
	}
</style>

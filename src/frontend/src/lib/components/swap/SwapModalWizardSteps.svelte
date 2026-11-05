<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import SwapBtcContexts from '$btc/components/swap/SwapBtcContexts.svelte';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapTokenWizard from '$lib/components/swap/SwapTokenWizard.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import { SUPPORTED_CROSS_SWAP_NETWORKS } from '$lib/constants/swap.constants';
	import {
		crossChainSwapNetworksMainnets,
		crossChainSwapNetworksMainnetsIds
	} from '$lib/derived/cross-chain-networks.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
	import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import type { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { COLORED_NETWORK_LOGOS_CONTEXT_KEY } from '$lib/stores/colored-network-logos.store';
	import {
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		type ModalNetworksListContext
	} from '$lib/stores/modal-networks-list.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { WizardStepsGetTokenType } from '$lib/types/get-token';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapSelectTokenType } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import type { WizardModal, WizardStep, WizardSteps } from '$lib/types/wizard';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import { networksWithSupport } from '$lib/utils/swap-tokens-filter.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		steps: WizardSteps<WizardStepsSwap | WizardStepsGetTokenType>;
		currentStep?: WizardStep<WizardStepsSwap | WizardStepsGetTokenType>;
		selectTokenType?: SwapSelectTokenType;
		modal: WizardModal<WizardStepsSwap | WizardStepsGetTokenType>;
		onClose: () => void;
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStepsSwap;
		swapFailedProgressSteps?: ProgressStepsSwap[];
	}

	let {
		modal,
		steps,
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		swapFailedProgressSteps = $bindable(),
		currentStep,
		selectTokenType = $bindable(),
		onClose
	}: Props = $props();

	const {
		setSourceToken,
		setDestinationToken,
		sourceToken,
		destinationToken,
		receiveSupportedData
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setFilterNetwork, setFilterQuery, setFilterCategoryTag, saveFilters, restoreFilters } =
		getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const { setAllowedNetworkIds, resetAllowedNetworkIds } = getContext<ModalNetworksListContext>(
		MODAL_NETWORKS_LIST_CONTEXT_KEY
	);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// A swap is told apart by its two networks, so every network logo in it is in its brand colour.
	setContext(COLORED_NETWORK_LOGOS_CONTEXT_KEY, true);

	let isBitcoinSource = $derived(isNetworkIdBitcoin($sourceToken?.network?.id));

	type TokenSide = 'source' | 'destination';

	// The asset type either side starts on: the assets page's, as Send does.
	const getInitialCategory = (): TokenCategoryTagValue | undefined =>
		isRouteTokens(page) ? $tokenCategoryFilter : undefined;

	// The header's network, where either side starts when it can use it.
	const getInitialNetwork = (allowedIds?: NetworkId[]): Network | undefined => {
		const network = $selectedNetwork;

		if (isNullish(network) || !$crossChainSwapNetworksMainnetsIds.includes(network.id)) {
			return;
		}

		if (nonNullish(allowedIds) && allowedIds.length > 0 && !allowedIds.includes(network.id)) {
			return;
		}

		return network;
	};

	const computeDestinationAllowedIds = (source: Token): NetworkId[] | undefined => {
		const baseAllowedIds = SUPPORTED_CROSS_SWAP_NETWORKS[source.network.id];

		const supportedData = get(receiveSupportedData);
		if (isNullish(supportedData)) {
			return baseAllowedIds;
		}

		const reachableIds = networksWithSupport({
			networks: get(crossChainSwapNetworksMainnets),
			tokens: get(allSwapUniverseTokens),
			supportedData
		});

		const reachableSet = new Set(reachableIds);

		if (isNullish(baseAllowedIds)) {
			return reachableIds;
		}

		return baseAllowedIds.filter((id) => reachableSet.has(id));
	};

	// The networks the list may offer: every swap network to pay with; to receive, the ones the pay
	// token reaches. Returns what it allowed, `undefined` for no constraint.
	const applyNetworkConstraints = (side: TokenSide): NetworkId[] | undefined => {
		if (side === 'source' || isNullish($sourceToken)) {
			resetAllowedNetworkIds();

			return;
		}

		// Intersect the static cross-swap pre-filter with networks that have at least one reachable
		// destination via the providers supporting the source.
		const allowedIds = computeDestinationAllowedIds($sourceToken);

		if (isNullish(allowedIds)) {
			resetAllowedNetworkIds();

			return;
		}

		setAllowedNetworkIds(allowedIds);

		return allowedIds;
	};

	const enterTokenList = (side: TokenSide) => {
		swapAmountsStore.reset();

		setFilterQuery('');

		selectTokenType = side;

		goToStep(WizardStepsSwap.TOKENS_LIST);

		const allowedIds = applyNetworkConstraints(side);

		// Each side reopens on the network and asset type it was left on, so a pick never moves them
		// and the two sides never share them. They live in the tokens list context, which outlives this
		// component (Get Token rebuilds it on every step). A kept network the side can no longer use
		// gives way to all networks in `SwapTokensList`, which knows what the list holds.
		if (restoreFilters(side)) {
			return;
		}

		setFilterNetwork(getInitialNetwork(allowedIds));

		setFilterCategoryTag(getInitialCategory());
	};

	const showTokensList = (tokenSource: TokenSide) => enterTokenList(tokenSource);

	const closeTokenList = () => {
		if (nonNullish(selectTokenType)) {
			saveFilters(selectTokenType);
		}

		goToStep(WizardStepsSwap.SWAP);

		resetAllowedNetworkIds();

		setFilterQuery('');

		selectTokenType = undefined;
	};

	const selectToken = (token: Token) => {
		const selectedToken = selectTokenType === 'source' ? $sourceToken : $destinationToken;

		// The pick that is already made: nothing to change.
		if (token.id === selectedToken?.id) {
			closeTokenList();

			return;
		}

		if (selectTokenType === 'source') {
			// The amount survives a source-token change, but the new token may not be able to
			// represent its precision — a Max on BTC (8 decimals) followed by a switch to USDC (6)
			// leaves an amount no ledger call could express. `tryParseToken` returning `undefined`
			// is exactly that signal, so drop the amount here rather than carry one the forms can
			// only reject, alongside the quote `enterTokenList` has already reset.
			if (
				nonNullish(swapAmount) &&
				isNullish(tryParseToken({ value: `${swapAmount}`, unitName: token.decimals }))
			) {
				swapAmount = undefined;
			}

			setSourceToken(token);
		} else if (selectTokenType === 'destination') {
			setDestinationToken(token);
		}

		closeTokenList();
	};

	const selectProvider = (detail: SwapMappedResult) => {
		swapAmountsStore.setManualProvider(detail);

		goToStep(WizardStepsSwap.SWAP);
	};

	const goToStep = (stepName: WizardStepsSwap | WizardStepsGetTokenType) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({
			modal,
			steps,
			stepName
		});
	};
</script>

<!--
  Wraps the keyed block rather than sitting inside it. `{#key}` rebuilds its whole subtree on
  every step change, and `SwapBtcContexts` owns two things that must not be rebuilt with it:
  the `UtxosFeeContexts` store, and a teardown that clears the UTXO set, the fee percentiles
  and the reserved outpoints. Mounted inside, the walk from the form to Review wiped all four
  and left Review waiting on two update calls to refill them — a confirmation inside that
  window failed on a missing fee, and every rebuild also spent one of the fifteen calls a
  minute the backend allows for the reserved-outpoint list.
-->
<SwapBtcContexts amount={swapAmount} load={isBitcoinSource} networkId={$sourceToken?.network?.id}>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSwap.TOKENS_LIST}
			<SwapTokensList
				onCloseTokensList={closeTokenList}
				onSelectToken={selectToken}
				side={selectTokenType}
			/>
		{:else if currentStep?.name === WizardStepsSwap.SELECT_PROVIDER}
			<SwapProviderListModal
				onCloseProviderList={() => goToStep(WizardStepsSwap.SWAP)}
				onSelectProvider={selectProvider}
				{slippageValue}
			/>
		{:else if currentStep?.name === WizardStepsSwap.SWAP || currentStep?.name === WizardStepsSwap.REVIEW || currentStep?.name === WizardStepsSwap.SWAPPING}
			<SwapTokenWizard
				{currentStep}
				onBack={() => modal?.back()}
				{onClose}
				onNext={() => modal?.next()}
				onShowProviderList={() => goToStep(WizardStepsSwap.SELECT_PROVIDER)}
				onShowTokensList={showTokensList}
				bind:swapAmount
				bind:receiveAmount
				bind:slippageValue
				bind:swapProgressStep
				bind:swapFailedProgressSteps
			/>
		{/if}
	{/key}
</SwapBtcContexts>

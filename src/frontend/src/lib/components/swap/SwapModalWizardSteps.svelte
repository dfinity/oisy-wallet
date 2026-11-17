<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import SwapBtcContexts from '$btc/components/swap/SwapBtcContexts.svelte';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapReceiveNetworkList from '$lib/components/swap/SwapReceiveNetworkList.svelte';
	import SwapTokenWizard from '$lib/components/swap/SwapTokenWizard.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import {
		SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
		SWAP_RECEIVE_SHORTCUT_SAME_NETWORK
	} from '$lib/constants/test-ids.constants';
	import { allCrossChainSwapTokens } from '$lib/derived/all-tokens.derived';
	import {
		crossChainSwapNetworksMainnets,
		crossChainSwapNetworksMainnetsIds
	} from '$lib/derived/cross-chain-networks.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
	import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { loadDisabledErc20AndSplTokensExchanges } from '$lib/services/swap.services';
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
	import {
		SWAP_RECEIVE_SHORTCUTS_CONTEXT_KEY,
		type SwapReceiveShortcutsContext
	} from '$lib/stores/swap-receive-shortcuts.store';
	import {
		SWAP_CONTEXT_KEY,
		type SwapContext,
		type SwapTokenListFilters
	} from '$lib/stores/swap.store';
	import type { WizardStepsGetTokenType } from '$lib/types/get-token';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapSelectTokenType } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import type { WizardModal, WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleWarn } from '$lib/utils/console.utils';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import { getReceiveNetworkIds } from '$lib/utils/swap.utils';
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
		receiveSupportedData,
		getTokenListFilters,
		setTokenListFilters,
		markTokensPriced,
		tokenListReturnFocus
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const {
		filterNetwork,
		setFilterNetwork,
		setFilterQuery,
		filterCategoryTag,
		setFilterCategoryTag
	} = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const { setAllowedNetworkIds, resetAllowedNetworkIds } = getContext<ModalNetworksListContext>(
		MODAL_NETWORKS_LIST_CONTEXT_KEY
	);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// A swap is told apart by its two networks, so every network logo in it is in its brand colour.
	setContext(COLORED_NETWORK_LOGOS_CONTEXT_KEY, true);

	// The exchange worker prices enabled tokens only. Swap can open before every token list has loaded,
	// so the disabled ERC-20 and SPL tokens it lists are priced as they arrive, each once per opening.
	$effect(() => {
		const tokens = markTokensPriced($allCrossChainSwapTokens.filter(({ enabled }) => !enabled));

		if (tokens.length === 0) {
			return;
		}

		loadDisabledErc20AndSplTokensExchanges({ tokens }).catch((err: unknown) =>
			consoleWarn('Failed to load the prices of disabled swap tokens:', err)
		);
	});

	let isBitcoinSource = $derived(isNetworkIdBitcoin($sourceToken?.network?.id));

	type TokenSide = 'source' | 'destination';

	// The networks a side's list may offer: every swap network to pay with; to receive, the ones the
	// pay token reaches. `undefined` for no constraint.
	const getAllowedNetworkIds = (side: TokenSide): NetworkId[] | undefined =>
		side === 'source' || isNullish($sourceToken)
			? undefined
			: getReceiveNetworkIds({
					sourceToken: $sourceToken,
					supportedData: get(receiveSupportedData),
					networks: get(crossChainSwapNetworksMainnets),
					tokens: get(allSwapUniverseTokens)
				});

	const applyNetworkConstraints = (side: TokenSide) => {
		const allowedIds = getAllowedNetworkIds(side);

		if (isNullish(allowedIds)) {
			resetAllowedNetworkIds();

			return;
		}

		setAllowedNetworkIds(allowedIds);
	};

	// A network a side's list can open on: a swap network it may offer. Any other opens on all.
	const getUsableNetwork = ({
		network,
		side
	}: {
		network: Network | undefined;
		side: TokenSide;
	}): Network | undefined => {
		if (isNullish(network) || !$crossChainSwapNetworksMainnetsIds.includes(network.id)) {
			return;
		}

		const allowedIds = getAllowedNetworkIds(side);

		if (nonNullish(allowedIds) && allowedIds.length > 0 && !allowedIds.includes(network.id)) {
			return;
		}

		return network;
	};

	// Where a side's list opens until the person changes its filters. To pay: the header's network and
	// the assets page's asset type, as Send does. To receive: the pay side's, that is the pay token's
	// network and the asset type the pay list was left on, so a same-network swap takes one step and a
	// cross-chain one is a choice.
	const getStartFilters = (side: TokenSide): SwapTokenListFilters => {
		const pageCategory = isRouteTokens(page) ? $tokenCategoryFilter : undefined;

		if (side === 'source') {
			return {
				network: getUsableNetwork({ network: $selectedNetwork, side }),
				category: pageCategory
			};
		}

		// The pay side's own filters once it has them, so all asset types picked there carries over too.
		const payFilters = getTokenListFilters('source');

		return {
			network: getUsableNetwork({ network: $sourceToken?.network ?? $selectedNetwork, side }),
			category: nonNullish(payFilters) ? payFilters.category : pageCategory
		};
	};

	// A side has its own filters once the person changes one on its list, even back to where it
	// started; from then on it reopens on them. Until then nothing is kept, so the receive side goes on
	// following the pay side. Only a change keeps them: a list a receive shortcut opened starts on the
	// shortcut's filters, which are not the person's.
	const onTokenListFiltersChange = () => {
		if (isNullish(selectTokenType)) {
			return;
		}

		setTokenListFilters({
			side: selectTokenType,
			filters: { network: get(filterNetwork), category: get(filterCategoryTag) }
		});
	};

	const enterTokenList = ({
		side,
		start,
		returnFocus
	}: {
		side: TokenSide;
		start?: SwapTokenListFilters;
		returnFocus?: string;
	}) => {
		tokenListReturnFocus.set(returnFocus);

		swapAmountsStore.reset();

		setFilterQuery('');

		selectTokenType = side;

		goToStep(WizardStepsSwap.TOKENS_LIST);

		applyNetworkConstraints(side);

		// A pick never moves a side's filters. Kept in the swap context, which outlives this component
		// (Get Token rebuilds it on every step).
		const { network, category } = start ?? getTokenListFilters(side) ?? getStartFilters(side);

		setFilterNetwork(network);

		setFilterCategoryTag(category);
	};

	const showTokensList = (tokenSource: TokenSide) => enterTokenList({ side: tokenSource });

	// All asset types, so the list matches the shortcut's preview.
	setContext<SwapReceiveShortcutsContext>(SWAP_RECEIVE_SHORTCUTS_CONTEXT_KEY, {
		showReceiveList: (network) =>
			enterTokenList({
				side: 'destination',
				start: { network, category: undefined },
				returnFocus: nonNullish(network)
					? SWAP_RECEIVE_SHORTCUT_SAME_NETWORK
					: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN
			}),
		showMoveStep: () => goToStep(WizardStepsSwap.MOVE_TOKEN)
	});

	const closeTokenList = () => {
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
				onFiltersChange={onTokenListFiltersChange}
				onSelectToken={selectToken}
				side={selectTokenType}
			/>
		{:else if currentStep?.name === WizardStepsSwap.SELECT_PROVIDER}
			<SwapProviderListModal
				onCloseProviderList={() => goToStep(WizardStepsSwap.SWAP)}
				onSelectProvider={selectProvider}
				{slippageValue}
			/>
		{:else if currentStep?.name === WizardStepsSwap.MOVE_TOKEN}
			<SwapReceiveNetworkList
				onClose={() => goToStep(WizardStepsSwap.SWAP)}
				onSelectToken={(token) => {
					setDestinationToken(token);

					goToStep(WizardStepsSwap.SWAP);
				}}
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

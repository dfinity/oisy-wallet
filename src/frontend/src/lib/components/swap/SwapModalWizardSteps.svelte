<script lang="ts">
	import type { WizardModal, WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapTokenWizard from '$lib/components/swap/SwapTokenWizard.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import { SUPPORTED_CROSS_SWAP_NETWORKS } from '$lib/constants/swap.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
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
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		steps: WizardSteps<WizardStepsSwap | WizardStepsGetTokenType>;
		currentStep?: WizardStep<WizardStepsSwap | WizardStepsGetTokenType>;
		selectTokenType?: SwapSelectTokenType;
		modal: WizardModal<WizardStepsSwap | WizardStepsGetTokenType>;
		showSelectProviderModal: boolean;
		onClose: () => void;
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStepsSwap;
		swapFailedProgressSteps?: ProgressStepsSwap[];
		allNetworksEnabled: boolean;
	}

	let {
		modal,
		steps,
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		swapFailedProgressSteps = $bindable(),
		allNetworksEnabled = $bindable(),
		currentStep,
		showSelectProviderModal = $bindable(),
		selectTokenType = $bindable(),
		onClose
	}: Props = $props();

	const { setSourceToken, setDestinationToken, sourceToken, destinationToken } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setFilterNetwork, setFilterQuery } = getContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY
	);

	const { filteredNetworks, setAllowedNetworkIds, resetAllowedNetworkIds } =
		getContext<ModalNetworksListContext>(MODAL_NETWORKS_LIST_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	type TokenSide = 'source' | 'destination';

	const setNetworksMode = ({
		enabled,
		allowedIds
	}: {
		enabled: boolean;
		allowedIds?: NetworkId[];
	}) => {
		allNetworksEnabled = enabled;

		if (enabled) {
			resetAllowedNetworkIds();

			return;
		}

		if (nonNullish(allowedIds)) {
			setAllowedNetworkIds(allowedIds);
		}
	};

	// Returns the preferred network for a given side.
	// Priority order:
	// 1) Primary token network
	// 2) Selected page network
	// 3) Secondary token network
	// If allowedIds is provided, returns the first candidate whose id is allowed.
	// If none match (or none exist), returns undefined.
	const getPreferredNetworkForSide = ({
		side,
		allowedIds
	}: {
		side: TokenSide;
		allowedIds?: readonly NetworkId[];
	}): Network | undefined => {
		const primary = side === 'source' ? $sourceToken?.network : $destinationToken?.network;

		const secondary = side === 'source' ? $destinationToken?.network : $sourceToken?.network;

		return [primary, $selectedNetwork, secondary].reduce<Network | undefined>((acc, current) => {
			if (nonNullish(acc)) {
				return acc;
			}

			if (isNullish(current)) {
				return;
			}

			if (nonNullish(allowedIds) && !allowedIds.includes(current.id)) {
				return;
			}

			return current;
		}, undefined);
	};

	const applyListConstraints = (side: TokenSide) => {
		// SOURCE list: user can browse all networks (but keep current network preselected if any)
		if (side === 'source') {
			setNetworksMode({ enabled: true });

			setFilterNetwork(getPreferredNetworkForSide({ side }));

			return;
		}

		// DESTINATION list: constrain based on source/destination
		if (isNullish($sourceToken)) {
			// no source yet: no constraints
			setNetworksMode({ enabled: false });

			setFilterNetwork(getPreferredNetworkForSide({ side }));

			return;
		}

		// source selected (constraints apply)
		const allowedIds = isDefaultEthereumToken($sourceToken)
			? [$sourceToken.network.id]
			: SUPPORTED_CROSS_SWAP_NETWORKS[$sourceToken.network.id];

		setNetworksMode({ enabled: false, allowedIds });

		setFilterNetwork(getPreferredNetworkForSide({ side, allowedIds }));
	};

	const enterTokenList = (side: TokenSide) => {
		swapAmountsStore.reset();

		setFilterQuery('');

		selectTokenType = side;

		goToStep(WizardStepsSwap.TOKENS_LIST);

		applyListConstraints(side);
	};

	const showTokensList = (tokenSource: TokenSide) => enterTokenList(tokenSource);

	const closeTokenList = () => {
		goToStep(WizardStepsSwap.SWAP);

		setNetworksMode({ enabled: true });

		setFilterQuery('');

		selectTokenType = undefined;
	};

	const isDestinationCompatibleWithSource = ({
		source,
		destination
	}: {
		source: Token;
		destination: Token;
	}): boolean => {
		if (isDefaultEthereumToken(source)) {
			return source.network.id === destination.network.id;
		}

		const allowed = SUPPORTED_CROSS_SWAP_NETWORKS[source.network.id];

		return isNullish(allowed) ? true : allowed.includes(destination.network.id);
	};

	const selectToken = (token: Token) => {
		if (selectTokenType === 'source') {
			setSourceToken(token);

			setFilterNetwork(token.network);

			if (
				nonNullish($destinationToken) &&
				!isDestinationCompatibleWithSource({ source: token, destination: $destinationToken })
			) {
				setDestinationToken(undefined);
			}
		} else if (selectTokenType === 'destination') {
			setDestinationToken(token);

			setFilterNetwork(token.network);
		}

		closeTokenList();
	};

	const selectProvider = (detail: SwapMappedResult) => {
		swapAmountsStore.setSelectedProvider(detail);
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

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsSwap.TOKENS_LIST}
		<SwapTokensList
			onCloseTokensList={closeTokenList}
			onSelectNetworkFilter={() => goToStep(WizardStepsSwap.FILTER_NETWORKS)}
			onSelectToken={selectToken}
		/>
	{:else if currentStep?.name === WizardStepsSwap.FILTER_NETWORKS}
		<ModalNetworksFilter
			{allNetworksEnabled}
			filteredNetworks={$filteredNetworks}
			onNetworkFilter={() => goToStep(WizardStepsSwap.TOKENS_LIST)}
			showStakeBalance={false}
		/>
	{:else if currentStep?.name === WizardStepsSwap.SELECT_PROVIDER}
		<SwapProviderListModal
			onCloseProviderList={() => goToStep(WizardStepsSwap.SWAP)}
			onSelectProvider={selectProvider}
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

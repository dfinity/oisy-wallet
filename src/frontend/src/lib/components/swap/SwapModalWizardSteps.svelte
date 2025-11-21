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

	const { setFilterNetwork } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const { filteredNetworks, setAllowedNetworkIds, resetAllowedNetworkIds } =
		getContext<ModalNetworksListContext>(MODAL_NETWORKS_LIST_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const showDestinationTokenList = () => {
		if (nonNullish($sourceToken) && isDefaultEthereumToken($sourceToken)) {
			allNetworksEnabled = false;
			setAllowedNetworkIds([$sourceToken.network.id]);
			return;
		}

		if (isNullish($destinationToken) && nonNullish($sourceToken)) {
			allNetworksEnabled = false;
			setFilterNetwork($sourceToken.network);

			setAllowedNetworkIds(SUPPORTED_CROSS_SWAP_NETWORKS[$sourceToken.network.id]);
			return;
		}

		if (nonNullish($destinationToken) && nonNullish($sourceToken)) {
			allNetworksEnabled = false;
			setFilterNetwork($destinationToken.network);
			setAllowedNetworkIds(SUPPORTED_CROSS_SWAP_NETWORKS[$sourceToken.network.id]);
		}
	};

	const showSourceTokenList = () => {
		allNetworksEnabled = true;
		resetAllowedNetworkIds();

		if (nonNullish($sourceToken)) {
			setFilterNetwork($sourceToken.network);
			return;
		}

		if (nonNullish($destinationToken) && isNullish($sourceToken)) {
			setFilterNetwork($destinationToken.network);
		}
	};

	const showTokensList = (tokenSource: 'source' | 'destination') => {
		swapAmountsStore.reset();
		goToStep(WizardStepsSwap.TOKENS_LIST);

		if (tokenSource === 'destination') {
			showDestinationTokenList();
		} else if (tokenSource === 'source') {
			showSourceTokenList();
		}

		selectTokenType = tokenSource;
	};

	const closeTokenList = () => {
		goToStep(WizardStepsSwap.SWAP);
		allNetworksEnabled = true;
		resetAllowedNetworkIds();

		selectTokenType = undefined;
	};

	const selectToken = (token: Token) => {
		if (selectTokenType === 'source') {
			setSourceToken(token);
			setFilterNetwork(token.network);
			if (
				(nonNullish($destinationToken) &&
					SUPPORTED_CROSS_SWAP_NETWORKS[token.network.id] &&
					!SUPPORTED_CROSS_SWAP_NETWORKS[token.network.id].includes(
						$destinationToken?.network.id
					)) ||
				(isDefaultEthereumToken(token) && token.network.id !== $destinationToken?.network.id)
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

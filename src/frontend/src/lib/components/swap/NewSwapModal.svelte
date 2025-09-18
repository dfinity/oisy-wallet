<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import NewSwapWizard from './NewSwapWizard.svelte';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import { swapWizardSteps } from '$lib/config/swap.config';
	import {
		SUPPORTED_CROSS_SWAP_NETWORKS,
		SWAP_DEFAULT_SLIPPAGE_VALUE
	} from '$lib/constants/swap.constants';
	import { SWAP_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import {
		crossChainSwapNetworksMainnets,
		crossChainSwapNetworksMainnetsIds
	} from '$lib/derived/cross-chain-networks.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { swappableTokens } from '$lib/derived/swap.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalNetworksListContext,
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		type ModalNetworksListContext
	} from '$lib/stores/modal-networks-list.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext, initSwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapSelectTokenType } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	const { setSourceToken, setDestinationToken, sourceToken, destinationToken } =
		setContext<SwapContext>(
			SWAP_CONTEXT_KEY,
			initSwapContext({
				sourceToken: $swappableTokens.sourceToken,
				destinationToken: $swappableTokens.destinationToken
			})
		);

	const { setFilterNetwork } = setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: [],
			filterNetwork:
				nonNullish($selectedNetwork) &&
				$crossChainSwapNetworksMainnetsIds.includes($selectedNetwork.id)
					? $selectedNetwork
					: undefined,
			filterNetworksIds: $crossChainSwapNetworksMainnetsIds
		})
	);

	const { filteredNetworks, setAllowedNetworkIds, resetAllowedNetworkIds } =
		setContext<ModalNetworksListContext>(
			MODAL_NETWORKS_LIST_CONTEXT_KEY,
			initModalNetworksListContext({
				networks: $crossChainSwapNetworksMainnets
			})
		);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let modal = $state<WizardModal<WizardStepsSwap>>();

	let steps = $derived<WizardSteps<WizardStepsSwap>>(swapWizardSteps({ i18n: $i18n }));

	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let slippageValue = $state<OptionAmount>(SWAP_DEFAULT_SLIPPAGE_VALUE);
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let swapFailedProgressSteps = $state<ProgressStepsSwap[]>([]);
	let currentStep = $state<WizardStep<WizardStepsSwap> | undefined>();
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
	let showSelectProviderModal = $state<boolean>(false);
	let allNetworksEnabled = $state<boolean>(true);

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

	const selectToken = ({ detail: token }: CustomEvent<Token>) => {
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

	let titleString = $derived(
		selectTokenType === 'source'
			? $i18n.swap.text.select_source_token
			: selectTokenType === 'destination'
				? $i18n.swap.text.select_destination_token
				: showSelectProviderModal
					? $i18n.swap.text.select_swap_provider
					: (currentStep?.title ?? '')
	);

	// TODO: Remove dispatch once all tests pass and the SwapModal.svelte component is removed
	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
			selectTokenType = undefined;
			showSelectProviderModal = false;
			dispatch('nnsClose');
		});

	const selectProvider = ({ detail }: CustomEvent<SwapMappedResult>) => {
		swapAmountsStore.setSelectedProvider(detail);
		goToStep(WizardStepsSwap.SWAP);
	};

	const goToStep = (stepName: WizardStepsSwap) => {
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

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsSwap.SWAPPING || showSelectProviderModal}
	onClose={close}
	{steps}
	testId={SWAP_TOKENS_MODAL}
	bind:currentStep
>
	{#snippet title()}{titleString}{/snippet}

	{#if currentStep?.name === WizardStepsSwap.TOKENS_LIST}
		<SwapTokensList
			on:icSelectToken={selectToken}
			on:icCloseTokensList={closeTokenList}
			on:icSelectNetworkFilter={() => goToStep(WizardStepsSwap.FILTER_NETWORKS)}
		/>
	{:else if currentStep?.name === WizardStepsSwap.FILTER_NETWORKS}
		<ModalNetworksFilter
			{allNetworksEnabled}
			filteredNetworks={$filteredNetworks}
			on:icNetworkFilter={() => goToStep(WizardStepsSwap.TOKENS_LIST)}
		/>
	{:else if currentStep?.name === WizardStepsSwap.SELECT_PROVIDER}
		<SwapProviderListModal
			on:icSelectProvider={selectProvider}
			on:icCloseProviderList={() => goToStep(WizardStepsSwap.SWAP)}
		/>
	{:else if currentStep?.name === WizardStepsSwap.SWAP || currentStep?.name === WizardStepsSwap.REVIEW || currentStep?.name === WizardStepsSwap.SWAPPING}
		<NewSwapWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			onShowTokensList={showTokensList}
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			bind:swapProgressStep
			bind:swapFailedProgressSteps
			on:icShowProviderList={() => goToStep(WizardStepsSwap.SELECT_PROVIDER)}
		/>
	{/if}
</WizardModal>

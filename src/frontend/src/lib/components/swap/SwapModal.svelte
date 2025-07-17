<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import { allSwapWizardSteps, swapWizardSteps } from '$lib/config/swap.config';
	import {
		SUPPORTED_CROSS_SWAP_NETWORKS,
		SWAP_DEFAULT_SLIPPAGE_VALUE
	} from '$lib/constants/swap.constants';
	import { SWAP_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { swappableTokens } from '$lib/derived/swap.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext, initSwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapSelectTokenType } from '$lib/types/swap';
	import { closeModal } from '$lib/utils/modal.utils';
	import ModalNetworksFilter from '../tokens/ModalNetworksFilter.svelte';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';
	import {
		initModalNetworksListContext,
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		type ModalNetworksListContext
	} from '$lib/stores/modal-networks-list.store';
	import {
		crossChainSwapNetworksMainnetsIds,
		crossChainSwapNetworksMainnets
	} from '$lib/derived/networks.derived';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import IcSwapWizard from './IcSwapWizard.svelte';
	import EvmSwapWizard from './EvmSwapWizard.svelte';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { isDefaultEthereumToken } from '$eth/utils/eth.utils';

	const {
		setSourceToken,
		setDestinationToken,
		sourceToken,
		destinationToken,
		sourceTokenNetwork,
		destinationTokenNetwork
	} = setContext<SwapContext>(
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
			filterNetwork: undefined,
			filterNetworksIds: $crossChainSwapNetworksMainnetsIds
		})
	);

	const { setAllowedNetworkIds } = setContext<ModalNetworksListContext>(
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		initModalNetworksListContext({
			networks: $crossChainSwapNetworksMainnets
		})
	);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	let modal = $state<WizardModal>();

	let steps = $derived<WizardSteps>(allSwapWizardSteps({ i18n: $i18n }));

	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let slippageValue = $state<OptionAmount>(SWAP_DEFAULT_SLIPPAGE_VALUE);
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let currentStep = $state<WizardStep | undefined>();
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
	let showSelectProviderModal = $state<boolean>(false);
	let stoppedTrigger = $state<boolean>(false);
	let allNetworksEnabled = $state<boolean>(true);

	const showDestinationTokenList = () => {
		if (nonNullish($sourceToken) && isDefaultEthereumToken($sourceToken)) {
			allNetworksEnabled = false;
			setAllowedNetworkIds([$sourceToken.network.id]);
			return;
		}

		if (isNullish($destinationToken) && nonNullish($sourceToken)) {
			allNetworksEnabled = false;
			setFilterNetwork($sourceTokenNetwork);

			setAllowedNetworkIds(SUPPORTED_CROSS_SWAP_NETWORKS[$sourceToken.network.id]);
		}

		if (nonNullish($destinationToken) && nonNullish($sourceToken)) {
			allNetworksEnabled = false;
			setFilterNetwork($destinationTokenNetwork);
			setAllowedNetworkIds(SUPPORTED_CROSS_SWAP_NETWORKS[$sourceToken.network.id]);
		}
	};

	const stopTriggerAmount = () => {
		stoppedTrigger = true;
	};

	const startTriggerAmount = () => {
		stoppedTrigger = false;
	};

	const showSourceTokenList = () => {
		allNetworksEnabled = true;
		setAllowedNetworkIds();

		if (nonNullish($sourceToken)) {
			setFilterNetwork($sourceTokenNetwork);
		}

		if (nonNullish($destinationToken) && isNullish($sourceToken)) {
			setFilterNetwork($destinationTokenNetwork);
		}
	};

	const showTokensList = ({ detail: type }: CustomEvent<SwapSelectTokenType>) => {
		swapAmountsStore.reset();
		goToStep(WizardStepsSwap.TOKENS_LIST);

		if (type === 'destination') {
			showDestinationTokenList();
		} else if (type === 'source') {
			showSourceTokenList();
		}

		selectTokenType = type;
	};

	const closeTokenList = () => {
		goToStep(WizardStepsSwap.SWAP);
		allNetworksEnabled = true;
		setAllowedNetworkIds();

		selectTokenType = undefined;
	};

	const selectToken = ({ detail: token }: CustomEvent<IcTokenToggleable>) => {
		if (selectTokenType === 'source') {
			setSourceToken(token);
			setFilterNetwork(token.network);
			if (
				(nonNullish($destinationToken) &&
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

	let title = $derived(
		selectTokenType === 'source'
			? $i18n.swap.text.select_source_token
			: selectTokenType === 'destination'
				? $i18n.swap.text.select_destination_token
				: showSelectProviderModal
					? $i18n.swap.text.select_swap_provider
					: (currentStep?.title ?? '')
	);

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

	// TODO: Migrate to Svelte 5, remove legacy slot usage and use render composition instead
</script>

<WizardModal
	{steps}
	testId={SWAP_TOKENS_MODAL}
	bind:this={modal}
	bind:currentStep
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSwap.SWAPPING || showSelectProviderModal}
>
	<svelte:fragment slot="title">{title}</svelte:fragment>

	{#if currentStep?.name === WizardStepsSwap.TOKENS_LIST}
		<SwapTokensList
			on:icSelectToken={selectToken}
			on:icCloseTokensList={closeTokenList}
			on:icSelectNetworkFilter={() => goToStep(WizardStepsSwap.FILTER_NETWORKS)}
		/>
	{:else if currentStep?.name === WizardStepsSwap.FILTER_NETWORKS}
		<ModalNetworksFilter
			on:icNetworkFilter={() => goToStep(WizardStepsSwap.TOKENS_LIST)}
			{allNetworksEnabled}
		/>
	{:else if currentStep?.name === WizardStepsSwap.SELECT_PROVIDER}
		<SwapProviderListModal
			on:icSelectProvider={selectProvider}
			on:icCloseProviderList={() => goToStep(WizardStepsSwap.SWAP)}
		/>
	{:else}
		<SwapAmountsContext
			amount={swapAmount}
			sourceToken={$sourceToken}
			destinationToken={$destinationToken}
			{slippageValue}
			{stoppedTrigger}
		>
			{#if isNullish($sourceToken) || isNetworkIdICP($sourceToken.network.id)}
				<IcSwapWizard
					{currentStep}
					bind:swapAmount
					bind:receiveAmount
					bind:slippageValue
					bind:swapProgressStep
					on:icBack={modal.back}
					on:icNext={modal.next}
					on:icClose={close}
					on:icShowTokensList={showTokensList}
					on:icShowProviderList={() => goToStep(WizardStepsSwap.SELECT_PROVIDER)}
					on:icStopTrigger={stopTriggerAmount}
					on:icStartTrigger={startTriggerAmount}
				/>
			{:else}
				<EvmSwapWizard
					{currentStep}
					bind:swapAmount
					bind:receiveAmount
					bind:slippageValue
					bind:swapProgressStep
					on:icBack={modal.back}
					on:icNext={modal.next}
					on:icClose={close}
					on:icShowTokensList={showTokensList}
					on:icStopTrigger={stopTriggerAmount}
					on:icStartTrigger={startTriggerAmount}
				/>
			{/if}
		</SwapAmountsContext>
	{/if}
</WizardModal>

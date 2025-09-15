<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
	import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
	import SwapWizard from '$lib/components/swap/SwapWizard.svelte';
	import { swapWizardSteps } from '$lib/config/swap.config';
	import { SWAP_DEFAULT_SLIPPAGE_VALUE } from '$lib/constants/swap.constants';
	import { SWAP_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { swappableTokens } from '$lib/derived/swap.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
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
	import { OISY_URL } from '$lib/constants/oisy.constants';

	const { setSourceToken, setDestinationToken } = setContext<SwapContext>(
		SWAP_CONTEXT_KEY,
		initSwapContext({
			sourceToken: $swappableTokens.sourceToken,
			destinationToken: $swappableTokens.destinationToken
		})
	);

	const { setFilterQuery } = setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: [],
			filterNetwork: ICP_NETWORK
		})
	);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let modal = $state<WizardModal<WizardStepsSwap>>();

	let steps = $derived<WizardSteps<WizardStepsSwap>>(swapWizardSteps({ i18n: $i18n }));

	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let slippageValue = $state<OptionAmount>(SWAP_DEFAULT_SLIPPAGE_VALUE);
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let swapFailedProgressSteps = $state<string[]>([]);
	let currentStep = $state<WizardStep<WizardStepsSwap> | undefined>();
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
	let showSelectProviderModal = $state<boolean>(false);

	const showTokensList = ({ detail: type }: CustomEvent<SwapSelectTokenType>) => {
		swapAmountsStore.reset();
		selectTokenType = type;
	};

	const closeTokenList = () => {
		selectTokenType = undefined;
		setFilterQuery('');
	};

	const selectToken = ({ detail: token }: CustomEvent<Token>) => {
		if (selectTokenType === 'source') {
			setSourceToken(token);
		} else if (selectTokenType === 'destination') {
			setDestinationToken(token);
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

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
			selectTokenType = undefined;
			showSelectProviderModal = false;
			dispatch('nnsClose');
		});

	const openSelectProviderModal = () => {
		showSelectProviderModal = true;
	};
	const closeSelectProviderModal = () => {
		showSelectProviderModal = false;
	};
	const selectProvider = ({ detail }: CustomEvent<SwapMappedResult>) => {
		swapAmountsStore.setSelectedProvider(detail);
		closeSelectProviderModal();
	};



	console.log(OISY_URL, 'oisy url');
	

	// TODO: Migrate to Svelte 5, remove legacy slot usage and use render composition instead
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

	{#if nonNullish(selectTokenType)}
		<SwapTokensList on:icSelectToken={selectToken} on:icCloseTokensList={closeTokenList} />
	{:else if showSelectProviderModal}
		<SwapProviderListModal
			on:icSelectProvider={selectProvider}
			on:icCloseProviderList={closeSelectProviderModal}
		/>
	{:else}
		<SwapWizard
			{currentStep}
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			bind:swapProgressStep
			bind:swapFailedProgressSteps
			on:icBack={modal.back}
			on:icNext={modal.next}
			on:icClose={close}
			on:icShowTokensList={showTokensList}
			on:icShowProviderList={openSelectProviderModal}
		/>
	{/if}
</WizardModal>

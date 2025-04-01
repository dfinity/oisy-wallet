<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
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
	import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext, initSwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapSelectTokenType } from '$lib/types/swap';
	import { closeModal } from '$lib/utils/modal.utils';

	const { setSourceToken, setDestinationToken } = setContext<SwapContext>(
		SWAP_CONTEXT_KEY,
		initSwapContext({
			sourceToken: $swappableTokens.sourceToken,
			destinationToken: $swappableTokens.destinationToken
		})
	);

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: [],
			filterNetwork: ICP_NETWORK
		})
	);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let modal: WizardModal;

	let steps: WizardSteps;
	$: steps = swapWizardSteps({ i18n: $i18n });

	let swapAmount: OptionAmount;
	let receiveAmount: number | undefined;
	let slippageValue: OptionAmount = SWAP_DEFAULT_SLIPPAGE_VALUE;
	let swapProgressStep = ProgressStepsSwap.INITIALIZATION;
	let currentStep: WizardStep | undefined;
	let selectTokenType: SwapSelectTokenType | undefined;

	const showTokensList = ({ detail: type }: CustomEvent<SwapSelectTokenType>) => {
		swapAmountsStore.reset();
		selectTokenType = type;
	};

	const closeTokenList = () => {
		selectTokenType = undefined;
	};

	const selectToken = ({ detail: token }: CustomEvent<IcTokenToggleable>) => {
		if (selectTokenType === 'source') {
			setSourceToken(token);
		} else if (selectTokenType === 'destination') {
			setDestinationToken(token);
		}
		closeTokenList();
	};

	let title = '';
	$: title =
		selectTokenType === 'source'
			? $i18n.swap.text.select_source_token
			: selectTokenType === 'destination'
				? $i18n.swap.text.select_destination_token
				: (currentStep?.title ?? '');

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			currentStep = undefined;
			selectTokenType = undefined;
			dispatch('nnsClose');
		});
</script>

<WizardModal
	{steps}
	testId={SWAP_TOKENS_MODAL}
	bind:this={modal}
	bind:currentStep
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSwap.SWAPPING}
>
	<svelte:fragment slot="title">{title}</svelte:fragment>

	{#if nonNullish(selectTokenType)}
		<SwapTokensList on:icSelectToken={selectToken} on:icCloseTokensList={closeTokenList} />
	{:else}
		<SwapWizard
			{currentStep}
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			bind:swapProgressStep
			on:icBack={modal.back}
			on:icNext={modal.next}
			on:icClose={close}
			on:icShowTokensList={showTokensList}
		/>
	{/if}
</WizardModal>

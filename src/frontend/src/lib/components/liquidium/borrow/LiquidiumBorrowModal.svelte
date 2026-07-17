<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Chain } from '@liquidium/client';
	import { setContext } from 'svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import LiquidiumSelectTokenForm from '$lib/components/liquidium/LiquidiumSelectTokenForm.svelte';
	import LiquidiumBorrowForm from '$lib/components/liquidium/borrow/LiquidiumBorrowForm.svelte';
	import LiquidiumBorrowProgress from '$lib/components/liquidium/borrow/LiquidiumBorrowProgress.svelte';
	import LiquidiumBorrowReview from '$lib/components/liquidium/borrow/LiquidiumBorrowReview.svelte';
	import LiquidiumBorrowSummary from '$lib/components/liquidium/borrow/LiquidiumBorrowSummary.svelte';
	import LiquidiumBorrowTokensList from '$lib/components/liquidium/borrow/LiquidiumBorrowTokensList.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { liquidiumBorrowWizardSteps } from '$lib/config/lend-borrow.config';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { liquidiumAssetPrices, liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { ProgressStepsLiquidiumBorrow } from '$lib/enums/progress-steps';
	import { WizardStepsLiquidiumBorrow } from '$lib/enums/wizard-steps';
	import {
		computeLiquidiumBorrowPreview,
		executeLiquidiumBorrow
	} from '$lib/services/liquidium-borrow.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		// Borrow market (asset/pool); collateral is the whole portfolio, none is selected.
		market?: LiquidiumMarket;
	}

	let { market }: Props = $props();

	// Seeded from the initial prop only; later switches happen through the picker.
	// svelte-ignore state_referenced_locally
	let selectedMarket = $state<LiquidiumMarket | undefined>(market);

	let modal: WizardModal<WizardStepsLiquidiumBorrow> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLiquidiumBorrow> | undefined = $state();
	let amount: OptionAmount = $state();
	let confirmChecked = $state(false);
	let borrowProgressStep: string = $state(ProgressStepsLiquidiumBorrow.INITIALIZATION);

	const tokensListContext = initModalTokensListContext({ tokens: [] });
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	const steps: WizardSteps<WizardStepsLiquidiumBorrow> = $derived(
		liquidiumBorrowWizardSteps({ i18n: $i18n })
	);

	let borrowToken = $derived(
		nonNullish(selectedMarket) ? LIQUIDIUM_ASSET_TOKENS[selectedMarket.asset] : undefined
	);
	let borrowPrice = $derived(
		nonNullish(selectedMarket) ? ($liquidiumAssetPrices[selectedMarket.asset] ?? 0) : 0
	);

	let newBorrowUsd = $derived((Number(amount) || 0) * borrowPrice);

	// Single source of the aggregate preview; with no amount it reflects the current LTV / health.
	let preview = $derived(
		nonNullish($liquidiumPortfolio)
			? computeLiquidiumBorrowPreview({ portfolio: $liquidiumPortfolio, newBorrowUsd })
			: undefined
	);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount) && nonNullish(borrowToken)
			? parseToken({ value: `${amount}`, unitName: borrowToken.decimals })
			: undefined
	);

	// Borrowed asset is delivered to the user's own oisy address on the pool's chain:
	// native BTC address for a BTC pool, ICRC account for an ICP-chain pool, else ETH.
	let receiverAddress = $derived(
		selectedMarket?.chain === 'BTC'
			? $btcAddressMainnet
			: selectedMarket?.chain === 'ICP'
				? $icrcAccountIdentifierText
				: $ethAddress
	);

	const goToStep = (stepName: WizardStepsLiquidiumBorrow) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Always enter the picker with a clean query so it never reopens filtered from a
	// previous visit (mirrors the swap / trade-deposit flows).
	const enterTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumBorrow.TOKENS_LIST);
	};

	// Cancelling the picker returns to the Borrow step — the amount form when a market
	// is chosen, or the select-token prompt on a neutral launch.
	const closeTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsLiquidiumBorrow.BORROW);
	};

	const selectMarket = (nextMarket: LiquidiumMarket) => {
		selectedMarket = nextMarket;
		// The typed amount is token-specific; drop it when switching.
		amount = undefined;
		confirmChecked = false;
		closeTokensList();
	};

	// The modal is not guaranteed to unmount between opens, so restore every piece of
	// launch state — including the selected market and the picker filters — back to what
	// the initial prop implies; otherwise the next open (or a neutral launch) inherits the
	// previously picked token / a stale filter query.
	const reset = () => {
		selectedMarket = market;
		amount = undefined;
		confirmChecked = false;
		borrowProgressStep = ProgressStepsLiquidiumBorrow.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);

	const borrow = async () => {
		const identity = $authIdentity;

		if (
			isNullish(identity) ||
			isNullish($ethAddress) ||
			isNullish(receiverAddress) ||
			isNullish(parsedAmount) ||
			isNullish(selectedMarket)
		) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed } });
			return;
		}

		const amountBaseUnits = parsedAmount;
		const receiver = receiverAddress;
		const { poolId, asset, chain } = selectedMarket;

		modal?.next();

		try {
			await executeLiquidiumBorrow({
				identity,
				ethAddress: $ethAddress,
				poolId,
				chain: chain as Chain,
				asset,
				amount: amountBaseUnits,
				receiverAddress: receiver,
				displayAmount: `${amount}`,
				progress: (step) => (borrowProgressStep = step)
			});

			borrowProgressStep = ProgressStepsLiquidiumBorrow.DONE;

			setTimeout(close, 750);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.liquidium.text.transaction_failed }, err });

			modal?.back();
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsLiquidiumBorrow.BORROWING}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if currentStep?.name === WizardStepsLiquidiumBorrow.TOKENS_LIST}
		<LiquidiumBorrowTokensList
			onClose={closeTokensList}
			onSelectMarket={selectMarket}
			{selectedMarket}
		/>
	{:else if isNullish(selectedMarket)}
		<LiquidiumSelectTokenForm onClose={close} onSelectToken={enterTokensList}>
			{#snippet topBanner()}
				{#if nonNullish($liquidiumPortfolio)}
					<LiquidiumBorrowSummary portfolio={$liquidiumPortfolio} />
				{/if}
			{/snippet}
		</LiquidiumSelectTokenForm>
	{:else if nonNullish($liquidiumPortfolio) && nonNullish(preview)}
		{#if currentStep?.name === WizardStepsLiquidiumBorrow.REVIEW}
			<LiquidiumBorrowReview
				{amount}
				{borrowPrice}
				market={selectedMarket}
				onBack={() => modal?.back()}
				onConfirm={borrow}
				{preview}
			/>
		{:else if currentStep?.name === WizardStepsLiquidiumBorrow.BORROWING}
			<LiquidiumBorrowProgress {borrowProgressStep} />
		{:else}
			<LiquidiumBorrowForm
				{borrowPrice}
				{borrowToken}
				market={selectedMarket}
				onClose={close}
				onNext={() => modal?.next()}
				onSelectToken={enterTokensList}
				portfolio={$liquidiumPortfolio}
				{preview}
				bind:amount
				bind:confirmChecked
			/>
		{/if}
	{/if}
</WizardModal>

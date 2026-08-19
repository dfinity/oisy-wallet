<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import TradingDepositForm from '$lib/components/trading/TradingDepositForm.svelte';
	import TradingDepositProgress from '$lib/components/trading/TradingDepositProgress.svelte';
	import TradingDepositReview from '$lib/components/trading/TradingDepositReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { tradingDepositWizardSteps } from '$lib/config/trading.config';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { oisyTradeDepositableTokens } from '$lib/derived/oisy-trade.derived';
	import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
	import { WizardStepsTradingDeposit } from '$lib/enums/wizard-steps';
	import { depositOisyTrade } from '$lib/services/oisy-trade.deposit.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let modal: WizardModal<WizardStepsTradingDeposit> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTradingDeposit> | undefined = $state();
	let depositProgressStep: string = $state(ProgressStepsTradingDeposit.INITIALIZATION);

	let token = $state<IcToken | undefined>();
	let amount = $state<OptionAmount>();
	let amountSetToMax = $state(false);

	const steps: WizardSteps<WizardStepsTradingDeposit> = $derived(
		tradingDepositWizardSteps({ i18n: $i18n })
	);

	// A brand-new (or fully-deposited) wallet has no supported token to deposit.
	let isEmpty = $derived($oisyTradeDepositableTokens.length === 0);

	// Reuse the shared token-picker pipeline (search box + network/type filters) the
	// swap and send modals use, seeded with the DEX-depositable tokens. Honor the
	// page's selected network like the send modal: the default "All networks" view is
	// pseudo-chain-fusion (mainnet-only), so without this a testnet DEX (staging) would
	// strip its own TESTICP/ckSepolia* tokens from the picker.
	const tokensListContext = initModalTokensListContext({
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- the context is initialized once at mount; the reactive token list is kept in sync below via `setTokens`.
		tokens: $oisyTradeDepositableTokens,
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- initialized once at mount; the page network is fixed for the modal's lifetime and locks the in-modal selector below.
		filterNetwork: $selectedNetwork
	});
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	$effect(() => {
		tokensListContext.setTokens($oisyTradeDepositableTokens);
	});

	const reset = () => {
		token = undefined;
		amount = undefined;
		amountSetToMax = false;
		depositProgressStep = ProgressStepsTradingDeposit.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);

	const goToStep = (stepName: WizardStepsTradingDeposit) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({ modal, steps, stepName });
	};

	const showTokensList = () => {
		tokensListContext.setFilterQuery('');

		goToStep(WizardStepsTradingDeposit.TOKENS_LIST);
	};

	const closeTokensList = () => {
		tokensListContext.setFilterQuery('');

		goToStep(WizardStepsTradingDeposit.DEPOSIT);
	};

	// The picker only ever lists DEX-depositable tokens; resolve the selection back
	// to the matching `IcToken` the deposit flow needs.
	const onSelectToken = (selected: Token) => {
		const matched = $oisyTradeDepositableTokens.find(({ id }) => id === selected.id);

		if (isNullish(matched)) {
			return;
		}

		if (token?.id !== matched.id) {
			amount = undefined;
			amountSetToMax = false;
		}
		token = matched;

		closeTokensList();
	};

	const deposit = async () => {
		if (nonNullish(token) && nonNullish(amount)) {
			goToStep(WizardStepsTradingDeposit.DEPOSITING);

			await depositOisyTrade({
				identity: $authIdentity,
				token,
				amount: parseToken({ value: `${amount}`, unitName: token.decimals }),
				progress: (step) => (depositProgressStep = step)
			});

			if (depositProgressStep === ProgressStepsTradingDeposit.DONE) {
				close();
			} else {
				goToStep(WizardStepsTradingDeposit.REVIEW);
			}
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsTradingDeposit.DEPOSITING ||
		currentStep?.name === WizardStepsTradingDeposit.FILTER_NETWORKS ||
		currentStep?.name === WizardStepsTradingDeposit.TOKENS_LIST}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if isEmpty}
		<ContentWithToolbar>
			<EmptyState
				description={$i18n.trading.deposit.empty_description}
				title={$i18n.trading.deposit.empty_title}
			/>

			<div class="mt-4 flex flex-wrap justify-center gap-2">
				{#each $oisyTradeDepositableTokens as token (token.id)}
					<span class="rounded-full border-1 border-tertiary bg-primary px-3 py-1 text-sm">
						{token.symbol}
					</span>
				{/each}
			</div>

			{#snippet toolbar()}
				<Button onclick={close}>{$i18n.core.text.close}</Button>
			{/snippet}
		</ContentWithToolbar>
	{:else if currentStep?.name === WizardStepsTradingDeposit.TOKENS_LIST}
		<ModalTokensList
			networkSelectorViewOnly={nonNullish($selectedNetwork)}
			onSelectNetworkFilter={() => goToStep(WizardStepsTradingDeposit.FILTER_NETWORKS)}
			onTokenButtonClick={onSelectToken}
		>
			{#snippet tokenListItem(token, onClick)}
				<ModalTokensListItem {onClick} {token} />
			{/snippet}
			{#snippet noResults()}
				<p class="text-primary">
					{$i18n.tokens.manage.text.all_tokens_zero_balance}
				</p>
			{/snippet}
			{#snippet toolbar()}
				<ButtonGroup>
					<ButtonBack onclick={closeTokensList} />
				</ButtonGroup>
			{/snippet}
		</ModalTokensList>
	{:else if currentStep?.name === WizardStepsTradingDeposit.FILTER_NETWORKS}
		<ModalNetworksFilter
			onNetworkFilter={() => goToStep(WizardStepsTradingDeposit.TOKENS_LIST)}
			showStakeBalance={false}
		/>
	{:else if currentStep?.name === WizardStepsTradingDeposit.REVIEW && nonNullish(token)}
		<TradingDepositReview
			{amount}
			onBack={() => goToStep(WizardStepsTradingDeposit.DEPOSIT)}
			onConfirm={deposit}
			{token}
		/>
	{:else if currentStep?.name === WizardStepsTradingDeposit.DEPOSITING}
		<TradingDepositProgress {depositProgressStep} />
	{:else}
		<TradingDepositForm
			onClose={close}
			onNext={() => goToStep(WizardStepsTradingDeposit.REVIEW)}
			onSelectToken={showTokensList}
			{token}
			bind:amount
			bind:amountSetToMax
		/>
	{/if}
</WizardModal>

<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import WithdrawWizard from '$lib/components/trading/WithdrawWizard.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import {
		allTradingWithdrawWizardSteps,
		tradingWithdrawWizardSteps
	} from '$lib/config/trading-withdraw.config';
	import { ZERO } from '$lib/constants/app.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { oisyTradeAssets } from '$lib/derived/oisy-trade.derived';
	import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
	import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		// Seeds the initial selection only; the user can switch token in-modal.
		// Omitted (e.g. the provider-page "Withdraw" entry) opens on the token
		// picker with no pre-selected token.
		withdrawToken?: OisyTradeWithdrawToken;
	}

	let { withdrawToken }: Props = $props();

	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- prop seeds the initial selection only
	let token = $state<IcToken | undefined>(withdrawToken?.token);

	// Falls back to the prop snapshot until the DEX balances store has loaded.
	let { free, reserved } = $derived.by(() => {
		const selected = token;

		if (isNullish(selected)) {
			return { free: ZERO, reserved: ZERO };
		}

		const asset = $oisyTradeAssets.find(({ token: { id } }) => id === selected.id);

		if (nonNullish(asset)) {
			return { free: asset.free, reserved: asset.reserved };
		}

		return selected.id === withdrawToken?.token.id
			? { free: withdrawToken.free, reserved: withdrawToken.reserved }
			: { free: ZERO, reserved: ZERO };
	});

	let modal: WizardModal<WizardStepsTradingWithdraw> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTradingWithdraw> | undefined = $state();
	let amount: OptionAmount = $state();
	let amountSetToMax = $state(false);
	let withdrawProgressStep: string = $state(ProgressStepsTradingWithdraw.INITIALIZATION);

	// No seed token (hero entry) opens on the token picker as the first step; a seeded
	// entry (Assets tab) opens on the withdraw form. `withdrawToken` is fixed for the
	// modal's lifetime, so this selection — and thus the steps array — stays stable.
	const steps: WizardSteps<WizardStepsTradingWithdraw> = $derived(
		nonNullish(withdrawToken)
			? tradingWithdrawWizardSteps({ i18n: $i18n })
			: allTradingWithdrawWizardSteps({ i18n: $i18n })
	);

	// Show the withdrawable (free) DEX balance, not the wallet balance.
	const withdrawableTokens = $derived(
		$oisyTradeAssets.map(({ token: assetToken, free: assetFree, freeUsd }) => ({
			...assetToken,
			balance: assetFree,
			usdBalance: freeUsd
		}))
	);

	const tokensListContext = initModalTokensListContext({
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- kept in sync below via setTokens
		tokens: withdrawableTokens,
		// Honor the page network so a testnet DEX (staging) isn't stripped by the
		// default mainnet-only view.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- page network is fixed for the modal's lifetime
		filterNetwork: $selectedNetwork,
		// Keep the free balances above from being re-sorted against the wallet
		// balances store.
		sortByBalance: false
	});
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	$effect(() => {
		tokensListContext.setTokens(withdrawableTokens);
	});

	const goToStep = (stepName: WizardStepsTradingWithdraw) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({ modal, steps, stepName });
	};

	const showTokensList = () => {
		tokensListContext.setFilterQuery('');

		goToStep(WizardStepsTradingWithdraw.TOKENS_LIST);
	};

	const closeTokensList = () => {
		tokensListContext.setFilterQuery('');

		goToStep(WizardStepsTradingWithdraw.WITHDRAW);
	};

	const onSelectToken = (selected: Token) => {
		const matched = $oisyTradeAssets.find(({ token: { id } }) => id === selected.id);

		if (isNullish(matched)) {
			return;
		}

		if (token?.id !== matched.token.id) {
			amount = undefined;
			amountSetToMax = false;
		}
		({ token } = matched);

		closeTokensList();
	};

	const reset = () => {
		token = withdrawToken?.token;
		amount = undefined;
		amountSetToMax = false;
		withdrawProgressStep = ProgressStepsTradingWithdraw.INITIALIZATION;
		currentStep = undefined;
		tokensListContext.resetFilters();
	};

	const close = () => closeModal(reset);
</script>

<SendTokenContext {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsTradingWithdraw.WITHDRAWING ||
			currentStep?.name === WizardStepsTradingWithdraw.TOKENS_LIST}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#if currentStep?.name === WizardStepsTradingWithdraw.TOKENS_LIST}
			<!-- Network filter is view-only: OISY TRADE holds IC-network tokens only. -->
			<ModalTokensList networkSelectorViewOnly onTokenButtonClick={onSelectToken}>
				{#snippet tokenListItem(listToken, onClick)}
					<ModalTokensListItem {onClick} token={listToken} />
				{/snippet}
				{#snippet noResults()}
					<p class="text-primary">{$i18n.core.text.no_results}</p>
				{/snippet}
				{#snippet toolbar()}
					<ButtonGroup>
						{#if nonNullish(token)}
							<ButtonBack onclick={closeTokensList} />
						{:else}
							<ButtonCloseModal />
						{/if}
					</ButtonGroup>
				{/snippet}
			</ModalTokensList>
		{:else if nonNullish(token)}
			<WithdrawWizard
				{currentStep}
				{free}
				onBack={modal.back}
				onClose={close}
				onNext={modal.next}
				onSelectToken={showTokensList}
				{reserved}
				{token}
				bind:amount
				bind:amountSetToMax
				bind:withdrawProgressStep
			/>
		{/if}
	</WizardModal>
</SendTokenContext>

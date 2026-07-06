<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import WithdrawWizard from '$lib/components/trading/WithdrawWizard.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { tradingWithdrawWizardSteps } from '$lib/config/trading-withdraw.config';
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
		// A preselection only — the user can switch to any other DEX holding in-modal.
		withdrawToken: OisyTradeWithdrawToken;
	}

	let { withdrawToken }: Props = $props();

	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- the prop only seeds the initial selection; afterwards the token is driven by the in-modal picker.
	let token = $state<IcToken>(withdrawToken.token);

	// free/reserved follow the selected token, read live from the polled DEX
	// balances. The prop snapshot only covers the preselected token while the
	// store has no data (e.g. right after opening).
	let { free, reserved } = $derived.by(() => {
		const asset = $oisyTradeAssets.find(({ token: { id } }) => id === token.id);

		if (nonNullish(asset)) {
			return { free: asset.free, reserved: asset.reserved };
		}

		return token.id === withdrawToken.token.id
			? { free: withdrawToken.free, reserved: withdrawToken.reserved }
			: { free: ZERO, reserved: ZERO };
	});

	let modal: WizardModal<WizardStepsTradingWithdraw> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTradingWithdraw> | undefined = $state();
	let amount: OptionAmount = $state();
	let amountSetToMax = $state(false);
	let withdrawProgressStep: string = $state(ProgressStepsTradingWithdraw.INITIALIZATION);

	const steps: WizardSteps<WizardStepsTradingWithdraw> = $derived(
		tradingWithdrawWizardSteps({ i18n: $i18n })
	);

	// The picker lists the user's DEX holdings with the withdrawable (free)
	// balance instead of the wallet balance — same trick as the limit-order
	// tokens list. `sortByBalance: false` below keeps these preset balances from
	// being re-mapped to the wallet balances store.
	const withdrawableTokens = $derived(
		$oisyTradeAssets.map(({ token: assetToken, free: assetFree, freeUsd }) => ({
			...assetToken,
			balance: assetFree,
			usdBalance: freeUsd
		}))
	);

	// Reuse the shared token-picker pipeline (search box + filters) the deposit
	// modal uses. The page's selected network is honored for the same reason: a
	// testnet DEX (staging) must not have its own tokens stripped by the default
	// pseudo-chain-fusion (mainnet-only) view.
	const tokensListContext = initModalTokensListContext({
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- the context is initialized once at mount; the reactive token list is kept in sync below via `setTokens`.
		tokens: withdrawableTokens,
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- initialized once at mount; the page network is fixed for the modal's lifetime and locks the in-modal selector below.
		filterNetwork: $selectedNetwork,
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

	// The picker only ever lists DEX holdings; resolve the selection back to the
	// matching asset the withdraw flow needs.
	const onSelectToken = (selected: Token) => {
		const matched = $oisyTradeAssets.find(({ token: { id } }) => id === selected.id);

		if (isNullish(matched)) {
			return;
		}

		if (token.id !== matched.token.id) {
			amount = undefined;
			amountSetToMax = false;
		}
		({ token } = matched);

		closeTokensList();
	};

	const reset = () => {
		({ token } = withdrawToken);
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
			<!-- OISY TRADE holds IC-network tokens only, so the network filter stays
				view-only — the shared picker still renders search and category filters. -->
			<ModalTokensList
				networkSelectorViewOnly
				onSelectNetworkFilter={() => {}}
				onTokenButtonClick={onSelectToken}
			>
				{#snippet tokenListItem(listToken, onClick)}
					<ModalTokensListItem {onClick} token={listToken} />
				{/snippet}
				{#snippet noResults()}
					<p class="text-primary">{$i18n.core.text.no_results}</p>
				{/snippet}
				{#snippet toolbar()}
					<ButtonGroup>
						<ButtonBack onclick={closeTokensList} />
					</ButtonGroup>
				{/snippet}
			</ModalTokensList>
		{:else}
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

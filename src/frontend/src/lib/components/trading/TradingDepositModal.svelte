<script lang="ts">
	import { WizardModal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import TradingDepositForm from '$lib/components/trading/TradingDepositForm.svelte';
	import TradingDepositProgress from '$lib/components/trading/TradingDepositProgress.svelte';
	import TradingDepositReview from '$lib/components/trading/TradingDepositReview.svelte';
	import TradingDepositTokensList from '$lib/components/trading/TradingDepositTokensList.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { tradingDepositWizardSteps } from '$lib/config/trading.config';
	import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
	import { WizardStepsTradingDeposit } from '$lib/enums/wizard-steps';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { oisyTradeDepositableTokens } from '$lib/derived/oisy-trade.derived';
	import { depositOisyTrade } from '$lib/services/oisy-trade.deposit.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { parseToken } from '$lib/utils/parse.utils';
	import { closeModal } from '$lib/utils/modal.utils';

	let modal: WizardModal<WizardStepsTradingDeposit> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTradingDeposit> | undefined = $state();
	let depositProgressStep: string = $state(ProgressStepsTradingDeposit.INITIALIZATION);

	let token = $state<IcToken | undefined>();
	let amount = $state<OptionAmount>();
	let amountSetToMax = $state(false);
	let consent = $state(false);
	// True while the in-step token picker is shown (inside the DEPOSIT step).
	let pickingToken = $state(false);

	const steps: WizardSteps<WizardStepsTradingDeposit> = $derived(
		tradingDepositWizardSteps({ i18n: $i18n })
	);

	// A brand-new (or fully-deposited) wallet has no supported token to deposit.
	let isEmpty = $derived($oisyTradeDepositableTokens.length === 0);

	const reset = () => {
		token = undefined;
		amount = undefined;
		amountSetToMax = false;
		consent = false;
		pickingToken = false;
		depositProgressStep = ProgressStepsTradingDeposit.INITIALIZATION;
		currentStep = undefined;
	};

	const close = () => closeModal(reset);

	const onSelectToken = (selected: IcToken) => {
		if (token?.id !== selected.id) {
			amount = undefined;
			amountSetToMax = false;
		}
		token = selected;
		pickingToken = false;
	};

	const deposit = async () => {
		if (nonNullish(token) && nonNullish(amount)) {
			modal?.next();

			await depositOisyTrade({
				identity: $authIdentity,
				token,
				amount: parseToken({ value: `${amount}`, unitName: token.decimals }),
				progress: (step) => (depositProgressStep = step)
			});

			if (depositProgressStep === ProgressStepsTradingDeposit.DONE) {
				close();
			} else {
				modal?.back();
			}
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsTradingDeposit.DEPOSITING}
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
	{:else if currentStep?.name === WizardStepsTradingDeposit.DEPOSIT}
		{#if pickingToken}
			<TradingDepositTokensList onClose={() => (pickingToken = false)} onSelect={onSelectToken} />
		{:else}
			<TradingDepositForm
				onClose={close}
				onNext={() => modal?.next()}
				onSelectToken={() => (pickingToken = true)}
				{token}
				bind:amount
				bind:amountSetToMax
				bind:consent
			/>
		{/if}
	{:else if currentStep?.name === WizardStepsTradingDeposit.REVIEW && nonNullish(token)}
		<TradingDepositReview {amount} onBack={() => modal?.back()} onConfirm={deposit} {token} />
	{:else if currentStep?.name === WizardStepsTradingDeposit.DEPOSITING}
		<TradingDepositProgress {depositProgressStep} />
	{/if}
</WizardModal>

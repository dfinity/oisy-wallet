<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import { getTokenFee } from '$icp/utils/token.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		TOOLS_USAGE_CREDITS_MODAL,
		TOOLS_USAGE_CREDITS_REVIEW_BUTTON,
		TOOLS_USAGE_CREDITS_SET_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { WizardStepsUsageCredits } from '$lib/enums/wizard-steps';
	import { setSpendingLimit, type OwnCycles } from '$lib/services/own-cycles.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { isDesktop } from '$lib/utils/device.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';

	interface Props {
		// The TCYCLES token, enabled or not: its symbol, decimals and ledger fee.
		token: IcToken;
		// What is left of the spending limit (the approval) and the TCYCLES balance, as the card read
		// them.
		ownCycles: OwnCycles;
		// The limit the user set last, when the card found it.
		previousLimit?: bigint;
		// Called when the approval fails, so the card reads both again before the user retries:
		// the approval states the one it replaces, which may have changed.
		onError: () => void;
		// Called with the new limit once the ledger took it.
		onSet: (limit: bigint) => void;
	}

	let { token, ownCycles, previousLimit, onError, onSet }: Props = $props();

	const format = (value: bigint): string =>
		formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals });

	// The amount is the new limit, not one added to it. 0 revokes it. It starts at the limit set
	// last, so filling it up again takes one click: seeded once, as the card doesn't read while the
	// modal is open.
	// svelte-ignore state_referenced_locally
	let amount = $state<OptionAmount>(
		nonNullish(previousLimit) && previousLimit > ZERO ? format(previousLimit) : undefined
	);
	let amountSetToMax = $state(false);
	let setting = $state(false);

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let exchangeRate = $derived($exchanges?.[token.id]?.usd);

	// Setting the limit costs one ledger fee, paid from the balance.
	let fee = $derived(getTokenFee(token) ?? ZERO);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount)
			? tryParseToken({ value: `${amount}`, unitName: token.decimals })
			: undefined
	);

	// The input's own check runs 300 ms after typing stops, so Review checks the balance itself.
	let invalid = $derived(
		isNullish(parsedAmount) ||
			parsedAmount === ownCycles.approved ||
			parsedAmount + fee > ownCycles.balance
	);

	const validateAmount = (userAmount: bigint): Error | undefined =>
		userAmount > ownCycles.balance
			? new Error($i18n.send.assertion.insufficient_funds)
			: userAmount + fee > ownCycles.balance
				? new Error($i18n.fee.assertion.insufficient_funds_for_fee)
				: undefined;

	let currentStep = $state<WizardStep<WizardStepsUsageCredits> | undefined>();
	let modal = $state<WizardModal<WizardStepsUsageCredits>>();

	let steps = $derived<WizardSteps<WizardStepsUsageCredits>>([
		{ name: WizardStepsUsageCredits.SET, title: $i18n.usage_credits.text.add_title },
		{ name: WizardStepsUsageCredits.REVIEW, title: $i18n.convert.text.review }
	]);

	const close = () => modalStore.close();

	const set = async () => {
		if (isNullish(parsedAmount) || invalid) {
			return;
		}

		setting = true;

		try {
			await setSpendingLimit({
				identity: $authIdentity,
				approved: ownCycles.approved,
				limit: parsedAmount
			});

			onSet(parsedAmount);

			toastsShow({
				text: replacePlaceholders($i18n.usage_credits.text.added, {
					$amount: format(parsedAmount),
					$token: token.symbol
				}),
				level: 'success',
				duration: 4000
			});

			close();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.usage_credits.error.add }, err });

			onError();
		} finally {
			setting = false;
		}
	};
</script>

<!-- With fiat values, as the send shows its amounts. -->
{#snippet limitRow(value: bigint, title: string)}
	<ConvertAmountDisplay amount={format(value)} {exchangeRate} symbol={token.symbol}>
		{#snippet label()}{title}{/snippet}
	</ConvertAmountDisplay>
{/snippet}

{#snippet limitRows()}
	{#if nonNullish(previousLimit)}
		{@render limitRow(previousLimit, $i18n.usage_credits.text.previous_limit)}
	{/if}
	{@render limitRow(ownCycles.approved, $i18n.usage_credits.text.own_credits_after)}
{/snippet}

{#snippet approvalFee()}
	<FeeDisplay decimals={token.decimals} {exchangeRate} feeAmount={fee} symbol={token.symbol}>
		{#snippet label()}{$i18n.fee.text.approval_fee}{/snippet}
	</FeeDisplay>
{/snippet}

<WizardModal
	bind:this={modal}
	disablePointerEvents={setting}
	onClose={close}
	{steps}
	testId={TOOLS_USAGE_CREDITS_MODAL}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsUsageCredits.REVIEW && nonNullish(parsedAmount)}
			<ContentWithToolbar>
				{@render limitRows()}
				{@render limitRow(parsedAmount, $i18n.usage_credits.text.new_limit)}
				{@render approvalFee()}

				{#snippet toolbar()}
					<ButtonGroup>
						<ButtonBack disabled={setting} onclick={() => modal?.back()} />

						<Button
							disabled={invalid || setting}
							loading={setting}
							onclick={set}
							testId={TOOLS_USAGE_CREDITS_SET_BUTTON}
						>
							{$i18n.usage_credits.text.set}
						</Button>
					</ButtonGroup>
				{/snippet}
			</ContentWithToolbar>
		{:else}
			<ContentWithToolbar>
				<p class="mb-6 text-sm text-tertiary">{$i18n.usage_credits.text.add_description}</p>

				<div class="mb-6">
					<TokenInput
						autofocus={isDesktop()}
						displayUnit={inputUnit}
						{exchangeRate}
						isSelectable={false}
						onCustomErrorValidate={validateAmount}
						{token}
						bind:amount
						bind:amountSetToMax
					>
						{#snippet title()}{$i18n.usage_credits.text.new_limit}{/snippet}

						{#snippet amountInfo()}
							<div class="text-tertiary">
								<TokenInputAmountExchange
									{amount}
									{exchangeRate}
									{token}
									bind:displayUnit={exchangeValueUnit}
								/>
							</div>
						{/snippet}

						{#snippet balance()}
							<MaxBalanceButton
								balance={ownCycles.balance}
								{fee}
								{token}
								bind:amount
								bind:amountSetToMax
							/>
						{/snippet}
					</TokenInput>
				</div>

				{@render limitRows()}
				{@render approvalFee()}

				{#snippet toolbar()}
					<ButtonGroup>
						<ButtonCancel onclick={close} />

						<Button
							disabled={invalid}
							onclick={() => modal?.next()}
							testId={TOOLS_USAGE_CREDITS_REVIEW_BUTTON}
						>
							{$i18n.convert.text.review_button}
						</Button>
					</ButtonGroup>
				{/snippet}
			</ContentWithToolbar>
		{/if}
	{/key}
</WizardModal>

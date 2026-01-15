<script lang="ts">
	import { getContext } from 'svelte';
	import IcReviewNetwork from '$icp/components/send/IcReviewNetwork.svelte';
	import GldtStakeTokenFeeModalValue from '$icp/components/stake/gldt/GldtStakeTokenFeeModalValue.svelte';
	import GldtUnstakeDelayedDissolveTerms from '$icp/components/stake/gldt/GldtUnstakeDelayedDissolveTerms.svelte';
	import GldtUnstakeImmediateDissolveTerms from '$icp/components/stake/gldt/GldtUnstakeImmediateDissolveTerms.svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { formatCurrency, formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount?: OptionAmount;
		amountToReceive?: number;
		dissolveInstantly: boolean;
		onBack: () => void;
		onUnstake: () => void;
	}

	let { amount, dissolveInstantly, amountToReceive, onBack, onUnstake }: Props = $props();

	const { sendTokenSymbol, sendTokenDecimals, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	// Should never happen given that the same checks are performed on the previous wizard step
	let invalid = $derived(invalidAmount(amount) || Number(amount) === 0);

	let instantDissolveFee = $derived(
		formatTokenBigintToNumber({
			value: $gldtStakeStore?.position?.instant_dissolve_fee ?? ZERO,
			displayDecimals: $sendTokenDecimals,
			unitName: $sendTokenDecimals
		})
	);
</script>

{#snippet stakeTermItems()}
	{#if dissolveInstantly}
		<GldtUnstakeImmediateDissolveTerms isReview />
	{:else}
		<GldtUnstakeDelayedDissolveTerms isReview />
	{/if}
{/snippet}

<StakeReview
	actionButtonLabel={$i18n.stake.text.unstake_now}
	{amount}
	disabled={invalid}
	{onBack}
	onConfirm={onUnstake}
>
	{#snippet subtitle()}
		{$i18n.stake.text.unstake_review_subtitle}
	{/snippet}

	{#snippet provider()}
		<StakeProvider provider={StakeProviderType.GLDT} showAllTerms terms={[stakeTermItems]} />
	{/snippet}

	{#snippet network()}
		<IcReviewNetwork />
	{/snippet}

	{#snippet fee()}
		<GldtStakeTokenFeeModalValue>
			{#snippet label()}
				{$i18n.stake.text.included_token_fee}
			{/snippet}
		</GldtStakeTokenFeeModalValue>

		{#if dissolveInstantly}
			<ModalValue>
				{#snippet label()}
					{$i18n.stake.text.included_dissolve_fee}
				{/snippet}

				{#snippet mainValue()}
					{instantDissolveFee}
					{$sendTokenSymbol}
				{/snippet}

				{#snippet secondaryValue()}
					{formatCurrency({
						value: instantDissolveFee * ($sendTokenExchangeRate ?? 0),
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}
				{/snippet}
			</ModalValue>
		{/if}

		<ModalValue>
			{#snippet label()}
				{$i18n.stake.text.amount_to_receive}
			{/snippet}

			{#snippet mainValue()}
				{amountToReceive}
				{$sendTokenSymbol}
			{/snippet}

			{#snippet secondaryValue()}
				{formatCurrency({
					value: (amountToReceive ?? 0) * ($sendTokenExchangeRate ?? 0),
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})}
			{/snippet}
		</ModalValue>
	{/snippet}
</StakeReview>

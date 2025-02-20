<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import Value from '$lib/components/ui/Value.svelte';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';

	const {
		feeStore: fee,
		ataFeeStore: ataFee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const { sendBalance, sendToken, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let usdFee: number;
	$: usdFee =
		nonNullish($fee) && nonNullish($decimals) && nonNullish($sendTokenExchangeRate)
			? (Number($fee) / Math.pow(10, $decimals)) * $sendTokenExchangeRate
			: 0;

	let usdAtaFee: number;
	$: usdAtaFee =
		nonNullish($ataFee) && nonNullish($decimals) && nonNullish($sendTokenExchangeRate)
			? (Number($ataFee) / Math.pow(10, $decimals)) * $sendTokenExchangeRate
			: 0;

	let insufficientFeeFunds = false;
	const debounceCheckFeeFunds = debounce(
		() =>
			(insufficientFeeFunds = nonNullish($sendBalance) && nonNullish($fee) && $sendBalance.lt($fee))
	);

	$: $sendBalance, $fee, debounceCheckFeeFunds();

	let insufficientAtaFeeFunds = false;
	const debounceCheckAtaFeeFunds = debounce(
		() =>
			(insufficientAtaFeeFunds =
				nonNullish($sendBalance) && nonNullish($ataFee) && $sendBalance.lt($ataFee))
	);

	$: $sendBalance, $ataFee, debounceCheckAtaFeeFunds();
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	<div class="flex gap-4">
		{#if nonNullish($fee) && nonNullish($decimals) && nonNullish($symbol)}
			{formatToken({
				value: BigNumber.from($fee),
				unitName: $decimals,
				displayDecimals: $decimals
			})}
			{$symbol}

			<div class="text-tertiary">
				{#if usdFee < SWAP_TOTAL_FEE_THRESHOLD}
					{`( < ${formatUSD({
						value: SWAP_TOTAL_FEE_THRESHOLD
					})} )`}
				{:else}
					{`( ${formatUSD({ value: usdFee })} )`}
				{/if}
			</div>
		{/if}
	</div>

	{#if insufficientFeeFunds && nonNullish($sendBalance)}
		<p in:slide={SLIDE_DURATION} class="text-cyclamen">
			{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
				$balance: formatToken({
					value: $sendBalance,
					displayDecimals: $decimals
				}),
				$symbol: $sendToken.symbol ?? ''
			})}
		</p>
	{/if}
</Value>

{#if nonNullish($ataFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="ataFee">
			<svelte:fragment slot="label">{$i18n.fee.text.ata_fee}</svelte:fragment>

			<div class="flex gap-4">
				{#if nonNullish($decimals) && nonNullish($symbol)}
					{formatToken({
						value: BigNumber.from(500),
						unitName: $decimals,
						displayDecimals: $decimals
					})}
					{$symbol}
				{/if}

				<div class="text-tertiary">
					{#if usdAtaFee < SWAP_TOTAL_FEE_THRESHOLD}
						{`( < ${formatUSD({
							value: SWAP_TOTAL_FEE_THRESHOLD
						})} )`}
					{:else}
						{`( ${formatUSD({ value: usdAtaFee })} )`}
					{/if}
				</div>
			</div>

			{#if insufficientAtaFeeFunds && nonNullish($sendBalance)}
				<p in:slide={SLIDE_DURATION} class="text-cyclamen">
					{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
						$balance: formatToken({
							value: $sendBalance,
							displayDecimals: $decimals
						}),
						$symbol: $sendToken.symbol ?? ''
					})}
				</p>
			{/if}
		</Value>
	</div>
{/if}

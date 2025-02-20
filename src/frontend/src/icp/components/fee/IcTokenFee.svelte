<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import Value from '$lib/components/ui/Value.svelte';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { sendToken, sendTokenDecimals, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let decimals: number | undefined;
	$: decimals = $sendToken?.decimals;

	let symbol: string | undefined;
	$: symbol = $sendToken?.symbol;

	let fee: bigint | undefined;
	$: fee = ($sendToken as OptionIcToken)?.fee;

	let usdFee: number;
	$: usdFee =
		nonNullish($sendTokenExchangeRate) && nonNullish(fee) && nonNullish($sendTokenExchangeRate)
			? usdValue({ token: $sendToken, balance: fee, exchangeRate: $sendTokenExchangeRate })
			: 0;

	let insufficientFeeFunds = false;

	const debounceCheckFeeFunds = debounce(
		() =>
			(insufficientFeeFunds = nonNullish($sendBalance) && nonNullish(fee) && $sendBalance.lt(fee))
	);

	$: $sendBalance, fee, debounceCheckFeeFunds();
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	<div class="flex gap-4">
		{#if nonNullish(fee) && nonNullish(decimals) && nonNullish(symbol)}
			{formatToken({
				value: BigNumber.from(fee),
				unitName: decimals,
				displayDecimals: $sendTokenDecimals
			})}
			{symbol}
		{/if}

		<div class="text-tertiary">
			{#if usdFee < SWAP_TOTAL_FEE_THRESHOLD}
				{`( < ${formatUSD({
					value: SWAP_TOTAL_FEE_THRESHOLD
				})} )`}
			{:else}
				{`( ${formatUSD({ value: usdFee })} )`}
			{/if}
		</div>
	</div>

	{#if insufficientFeeFunds && nonNullish($sendBalance)}
		<p in:slide={SLIDE_DURATION} class="text-cyclamen">
			{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
				$balance: formatToken({
					value: $sendBalance,
					displayDecimals: decimals
				}),
				$symbol: $sendToken.symbol ?? ''
			})}
		</p>
	{/if}
</Value>

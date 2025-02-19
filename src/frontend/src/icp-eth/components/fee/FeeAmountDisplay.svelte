<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { Utils } from 'alchemy-sdk';
	import { fade, slide } from 'svelte/transition';
	import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { TokenId } from '$lib/types/token';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let fee: BigNumber;
	export let feeSymbol: string;
	export let feeTokenId: TokenId;
	export let feeDecimals: number;

	let balance: Exclude<OptionBalance, null>;
	$: balance = nonNullish($balancesStore) ? ($balancesStore[feeTokenId]?.data ?? ZERO) : undefined;

	let feeAsNumber: number;
	$: feeAsNumber = Number(Utils.formatUnits(fee, feeDecimals));

	let insufficientFeeFunds = false;

	const debounceCheckFeeFunds = debounce(
		() => (insufficientFeeFunds = nonNullish(balance) && balance.lt(fee))
	);

	$: balance, fee, debounceCheckFeeFunds();
</script>

<div transition:fade class="flex gap-4">
	{formatToken({
		value: fee,
		displayDecimals: EIGHT_DECIMALS
	})}
	{feeSymbol}

	<div class="text-tertiary">
		{#if feeAsNumber < SWAP_TOTAL_FEE_THRESHOLD}
			{`( < ${formatUSD({
				value: SWAP_TOTAL_FEE_THRESHOLD
			})} )`}
		{:else}
			{`( ${formatUSD({ value: feeAsNumber })} )`}
		{/if}
	</div>
</div>
{#if insufficientFeeFunds && nonNullish(balance)}
	<p in:slide={SLIDE_DURATION} class="text-cyclamen">
		{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
			$balance: formatToken({
				value: balance,
				displayDecimals: feeDecimals
			}),
			$symbol: feeSymbol ?? ''
		})}
	</p>
{/if}

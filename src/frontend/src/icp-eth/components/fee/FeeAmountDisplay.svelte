<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { fade, slide } from 'svelte/transition';
	import { formatToken } from '$lib/utils/format.utils';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { TokenId } from '$lib/types/token';

	export let fee: BigNumber;
	export let feeSymbol: string;
	export let feeTokenId: TokenId;

	let balance: BigNumber | undefined;
	$: balance = nonNullish($balancesStore)
		? $balancesStore[feeTokenId]?.data ?? BigNumber.from(0n)
		: undefined;

	let insufficientFeeFunds = false;

	const debounceCheckFeeFunds = debounce(
		() => (insufficientFeeFunds = nonNullish(balance) && balance.lt(fee))
	);

	$: balance, fee, debounceCheckFeeFunds();
</script>

<div transition:fade>
	{formatToken({
		value: fee,
		displayDecimals: EIGHT_DECIMALS
	})}
	{feeSymbol}
</div>
{#if insufficientFeeFunds && nonNullish(balance)}
	<p in:slide={{ duration: 250 }} class="text-cyclamen">
		{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
			$balance: formatToken({
				value: balance,
				displayDecimals: EIGHT_DECIMALS
			}),
			$symbol: feeSymbol ?? ''
		})}
	</p>
{/if}

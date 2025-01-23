<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from 'ethers';
	import { createEventDispatcher } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import {formatUSD } from '$lib/utils/format.utils';

	export let amount: OptionAmount;
	export let exchangeRate: number | undefined;
	export let token: IcToken | undefined = undefined;
	export let mode: 'usd' | 'token' = 'usd';

	const dispatch = createEventDispatcher<{
		mode: 'usd' | 'token';
	}>();

	const handleModeToggle = () => {
		const newMode = mode === 'usd' ? 'token' : 'usd';
		dispatch('mode', newMode);
	};

	let amountUSD: number | undefined;
	$: amountUSD =
		mode === 'usd' && nonNullish(amount) && nonNullish(exchangeRate)
			? Number(amount) * exchangeRate
			: 0;

	let formattedTokenAmount: string | undefined;
	$: formattedTokenAmount = nonNullish(token)
		? mode === 'token' && nonNullish(amount)
			? `${Number(amount).toString()  } ${  token.symbol}`
			: `${0  } ${  token.symbol}`
		: '0';
</script>

<div class="flex items-center gap-1">
	<!-- improve ternary -->
	{#if nonNullish(exchangeRate)}
		<button on:click={handleModeToggle}>
			<IconArrowUpDown size="14" />
		</button>
		<span>{mode === 'usd' ? formatUSD({ value: amountUSD }) : formattedTokenAmount}</span>
	{:else}
		<span>{$i18n.swap.text.exchange_is_not_available}</span>
	{/if}
</div>

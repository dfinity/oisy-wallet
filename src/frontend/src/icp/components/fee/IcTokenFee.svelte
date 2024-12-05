<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatToken } from '$lib/utils/format.utils';

	const { sendToken, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let decimals: number | undefined;
	$: decimals = $sendToken?.decimals;

	let symbol: string | undefined;
	$: symbol = $sendToken?.symbol;

	let fee: bigint | undefined;
	$: fee = ($sendToken as OptionIcToken)?.fee;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish(fee) && nonNullish(decimals) && nonNullish(symbol)}
		{formatToken({
			value: BigNumber.from(fee),
			unitName: decimals,
			displayDecimals: $sendTokenDecimals
		})}
		{symbol}
	{/if}
</Value>

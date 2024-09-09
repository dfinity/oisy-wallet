<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	export let token: OptionToken;
	export let balance: BigNumber | undefined | null;
	export let source: string;
</script>

<Value ref="source" element="div">
	<svelte:fragment slot="label">{$i18n.send.text.source}</svelte:fragment>
	{source}
</Value>

<Value ref="balance" element="div">
	<svelte:fragment slot="label">{$i18n.send.text.balance}</svelte:fragment>
	{#if nonNullish(token)}
		{formatToken({
			value: balance ?? ZERO,
			unitName: token.decimals,
			displayDecimals: token.decimals
		})}
		{token.symbol}
	{:else}
		&ZeroWidthSpace;
	{/if}
</Value>

<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { OptionToken } from '$lib/types/token';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { nonNullish } from '@dfinity/utils';

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
			value: balance ?? BigNumber.from(0n),
			unitName: token.decimals,
			displayDecimals: token.decimals
		})}
		{token.symbol}
	{:else}
		&ZeroWidthSpace;
	{/if}
</Value>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher, onMount } from 'svelte';
	import type { UtxosFee } from '$btc/types/btc-send';
	import { BTC_DECIMALS } from '$env/tokens.btc.env';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';

	export let utxosFee: UtxosFee | undefined = undefined;

	const dispatch = createEventDispatcher();

	onMount(() => {
		if (isNullish(utxosFee)) {
			dispatch('icSelectUtxosFee');
		}
	});
</script>

<Value ref="utxos-fee" element="div">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if isNullish(utxosFee)}
		<span class="mt-2 block w-full max-w-[140px]"><SkeletonText /></span>
	{:else}
		{formatToken({
			value: BigNumber.from(utxosFee.feeSatoshis),
			unitName: BTC_DECIMALS,
			displayDecimals: BTC_DECIMALS
		})}
		BTC
	{/if}
</Value>

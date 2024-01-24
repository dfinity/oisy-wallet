<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import type { IcToken } from '$icp/types/ic';
	import type { NetworkId } from '$lib/types/network';
	import { BTC_DECIMALS, BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Value from '$lib/components/ui/Value.svelte';

	export let networkId: NetworkId | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($token as IcToken);

	let btcNetwork = false;
	$: btcNetwork = networkId === BTC_NETWORK_ID;

	let kytFee: bigint | undefined = undefined;
	$: kytFee = $ckBtcMinterInfoStore?.[$tokenId]?.data.kyt_fee;
</script>

{#if ckBTC && btcNetwork && nonNullish(kytFee)}
	<div transition:slide={{ easing: quintOut, axis: 'y' }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">Estimated Inter-network Fee</svelte:fragment>

			{formatToken({
				value: BigNumber.from(kytFee),
				unitName: BTC_DECIMALS,
				displayDecimals: BTC_DECIMALS
			})}
			BTC
		</Value>
	</div>
{/if}

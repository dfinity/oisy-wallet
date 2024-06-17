<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import {tokenId, tokenWithFallback} from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import type { IcToken } from '$icp/types/ic';
	import type { NetworkId } from '$lib/types/network';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Value from '$lib/components/ui/Value.svelte';
	import { BTC_DECIMALS } from '$env/tokens.btc.env';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';

	export let networkId: NetworkId | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($tokenWithFallback as IcToken);

	let btcNetwork = false;
	$: btcNetwork = isNetworkIdBitcoin(networkId);

	let kytFee: bigint | undefined = undefined;
	$: kytFee = nonNullish($tokenId) ? $ckBtcMinterInfoStore?.[$tokenId]?.data.kyt_fee : undefined;
</script>

{#if ckBTC && btcNetwork && nonNullish(kytFee)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_inter_network}</svelte:fragment>

			{formatToken({
				value: BigNumber.from(kytFee),
				unitName: BTC_DECIMALS,
				displayDecimals: BTC_DECIMALS
			})}
			BTC
		</Value>
	</div>
{/if}

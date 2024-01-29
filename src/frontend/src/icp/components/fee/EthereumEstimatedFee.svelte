<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
	import type { IcToken } from '$icp/types/ic';
	import type { NetworkId } from '$lib/types/network';
	import Value from '$lib/components/ui/Value.svelte';
	import { ETHEREUM_NETWORK_ID } from '$lib/constants/networks.constants';
	import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
	import { loadEip1559TransactionPrice } from '$icp/services/cketh.services';
	import { formatToken } from '$lib/utils/format.utils';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { BigNumber } from '@ethersproject/bignumber';

	export let networkId: NetworkId | undefined = undefined;

	let ckETH = false;
	$: ckETH = isTokenCkEthLedger($token as IcToken);

	let ethNetwork = false;
	$: ethNetwork = networkId === ETHEREUM_NETWORK_ID;

	let maxTransactionFee: bigint | undefined = undefined;
	$: maxTransactionFee = $eip1559TransactionPriceStore?.[$tokenId]?.data.max_transaction_fee;

	const loadFee = async () => {
		if (!ckETH || !ethNetwork) {
			return;
		}

		await loadEip1559TransactionPrice($token as IcToken);
	};

	$: networkId, (async () => await loadFee())();
</script>

{#if ckETH && ethNetwork}
	<div transition:slide={{ easing: quintOut, axis: 'y' }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">Estimated Ethereum Fee</svelte:fragment>

			&ZeroWidthSpace;
			{#if nonNullish(maxTransactionFee)}
				<span in:fade>
					{formatToken({
						value: BigNumber.from(maxTransactionFee),
						displayDecimals: 8
					})}
					{ETHEREUM_TOKEN.symbol}
				</span>
			{/if}
		</Value>
	</div>
{/if}

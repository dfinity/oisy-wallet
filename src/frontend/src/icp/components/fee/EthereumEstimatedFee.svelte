<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
	import type { IcToken } from '$icp/types/ic';
	import type { NetworkId } from '$lib/types/network';
	import Value from '$lib/components/ui/Value.svelte';
	import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
	import { loadEip1559TransactionPrice } from '$icp/services/cketh.services';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { onDestroy } from 'svelte';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { ckETHTwinToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let networkId: NetworkId | undefined = undefined;

	let ckETH = false;
	$: ckETH = isTokenCkEthLedger($token as IcToken);

	let ethNetwork = false;
	$: ethNetwork = isNetworkIdEthereum(networkId);

	let maxTransactionFee: bigint | undefined = undefined;
	$: maxTransactionFee = $eip1559TransactionPriceStore?.[$tokenId]?.data.max_transaction_fee;

	const loadFee = async () => {
		clearTimer();

		if (!ckETH || !ethNetwork) {
			return;
		}

		const load = async () => await loadEip1559TransactionPrice($token as IcToken);

		await load();

		timer = setInterval(load, 30000);
	};

	$: networkId, (async () => await loadFee())();

	let timer: NodeJS.Timeout | undefined;

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);
</script>

{#if ckETH && ethNetwork}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_eth}</svelte:fragment>

			<div>
				&ZeroWidthSpace;
				{#if nonNullish(maxTransactionFee)}
					<span in:fade>
						{formatToken({
							value: BigNumber.from(maxTransactionFee),
							displayDecimals: EIGHT_DECIMALS
						})}
						{$ckETHTwinToken.symbol}
					</span>
				{/if}
			</div>
		</Value>
	</div>
{/if}

<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
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
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { CKERC20_TO_ERC20_MAX_TRANSACTION_FEE } from '$icp/constants/cketh.constants';

	export let networkId: NetworkId | undefined = undefined;

	let ckETH = false;
	$: ckETH = isTokenCkEthLedger($token as IcToken);

	let ckEr20 = false;
	$: ckEr20 = isTokenCkErc20Ledger($token as IcToken);

	let ethNetwork = false;
	$: ethNetwork = isNetworkIdEthereum(networkId);

	let maxTransactionFeeEth: bigint | undefined = undefined;
	$: maxTransactionFeeEth = $eip1559TransactionPriceStore?.[$tokenId]?.data.max_transaction_fee;

	let maxTransactionFee: bigint | undefined = undefined;
	$: maxTransactionFee = nonNullish(maxTransactionFeeEth)
		? maxTransactionFeeEth + CKERC20_TO_ERC20_MAX_TRANSACTION_FEE
		: undefined;

	const loadFee = async () => {
		clearTimer();

		if ((!ckETH && !ckEr20) || !ethNetwork) {
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

{#if (ckETH || ckEr20) && ethNetwork}
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
						{$ckEthereumNativeToken.symbol}
					</span>
				{/if}
			</div>
		</Value>
	</div>
{/if}

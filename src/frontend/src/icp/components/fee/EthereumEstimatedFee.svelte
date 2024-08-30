<script lang="ts">
	import { slide } from 'svelte/transition';
	import { debounce, nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext, onDestroy, onMount } from 'svelte';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import type { Token } from '$lib/types/token';
	import FeeAmountDisplay from '$icp-eth/components/fee/FeeAmountDisplay.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatDuration } from '$lib/utils/format.utils';

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let feeToken: Token;
	$: feeToken = $ethereumFeeTokenCkEth ?? $ckEthereumNativeToken;

	let maxTransactionFee: bigint | undefined | null = undefined;
	$: maxTransactionFee = $store?.maxTransactionFee;

	let timePassed: string | undefined;

	const updateTimePassed = () => {
		timePassed = nonNullish($store?.maxTransactionFeeLastUpdate)
			? formatDuration(
					Math.floor(Date.now() - Number($store?.maxTransactionFeeLastUpdate) / 1e6) / 1000
				)
			: undefined;

		console.warn('updateTimePassed', timePassed);
	};

	const debouncedUpdateTimePassed = debounce(updateTimePassed, 500);

	onMount(debouncedUpdateTimePassed);

	let timer: NodeJS.Timeout | undefined;

	timer = setInterval(updateTimePassed, 1000);

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);
</script>

{#if nonNullish($store)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label"
				>{replacePlaceholders($i18n.fee.text.estimated_eth, {
					$timePassed: timePassed ?? '≈30s'
				})}</svelte:fragment
			>

			<div>
				{#if nonNullish(maxTransactionFee)}
					<FeeAmountDisplay
						fee={BigNumber.from(maxTransactionFee)}
						feeSymbol={feeToken.symbol}
						feeTokenId={feeToken.id}
						feeDecimals={feeToken.decimals}
					/>
				{:else}
					&ZeroWidthSpace;
				{/if}
			</div>
		</Value>
	</div>
{/if}

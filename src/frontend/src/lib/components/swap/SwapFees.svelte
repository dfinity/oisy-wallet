<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
	import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
	import SwapFee from '$lib/components/swap/SwapFee.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { formatTokenAmount, formatUSD } from '$lib/utils/format.utils';

	const { destinationToken, sourceToken, sourceTokenExchangeRate, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	let sourceTokenTransferFeeDisplay: string;
	$: sourceTokenTransferFeeDisplay =
		nonNullish($sourceToken) && nonNullish($icTokenFeeStore?.[$sourceToken.symbol])
			? formatTokenAmount({
					value: $icTokenFeeStore[$sourceToken.symbol],
					displayDecimals: $sourceToken.decimals,
					unitName: $sourceToken.decimals
				})
			: '0';

	let sourceTokenTransferFee: number;
	$: sourceTokenTransferFee = Number(sourceTokenTransferFeeDisplay);

	let sourceTokenApproveFeeDisplay: string;
	$: sourceTokenApproveFeeDisplay = isSourceTokenIcrc2 ? sourceTokenTransferFeeDisplay : '0';

	let sourceTokenApproveFee: number;
	$: sourceTokenApproveFee = Number(sourceTokenApproveFeeDisplay);

	let sourceTokenTotalFeeUSD: number;
	$: sourceTokenTotalFeeUSD = nonNullish($sourceTokenExchangeRate)
		? (sourceTokenTransferFee + sourceTokenApproveFee) * $sourceTokenExchangeRate
		: 0;
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
	<ModalExpandableValues>
		<ModalValue slot="list-header">
			<svelte:fragment slot="label">{$i18n.swap.text.total_fee}</svelte:fragment>

			<svelte:fragment slot="main-value">
				{#if isNullish($icTokenFeeStore?.[$sourceToken.symbol])}
					<div class="w-14 sm:w-16">
						<SkeletonText />
					</div>
				{:else if isNullish($sourceTokenExchangeRate)}
					{sourceTokenTransferFee + sourceTokenApproveFee} {$sourceToken.symbol}
				{:else if sourceTokenTotalFeeUSD < SWAP_TOTAL_FEE_THRESHOLD}
					{`< ${formatUSD({
						value: SWAP_TOTAL_FEE_THRESHOLD
					})}`}
				{:else}
					{formatUSD({
						value: sourceTokenTotalFeeUSD
					})}
				{/if}
			</svelte:fragment>
		</ModalValue>

		<svelte:fragment slot="list-items">
			{#if $isSourceTokenIcrc2 && sourceTokenApproveFee !== 0}
				<SwapFee
					fee={sourceTokenApproveFeeDisplay}
					symbol={$sourceToken.symbol}
					label={$i18n.swap.text.approval_fee}
				/>
			{/if}

			<SwapFee
				fee={sourceTokenTransferFeeDisplay}
				symbol={$sourceToken.symbol}
				label={$i18n.swap.text.network_fee}
			/>
		</svelte:fragment>
	</ModalExpandableValues>
{/if}

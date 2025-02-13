<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { formatTokenAmount, formatUSD } from '$lib/utils/format.utils';

	const { destinationToken, destinationTokenExchangeRate, sourceToken, sourceTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let liquidityProvidersFeeDisplay: string;
	$: liquidityProvidersFeeDisplay = nonNullish($destinationToken)
		? formatTokenAmount({
				value: $swapAmountsStore?.swapAmounts?.liquidityProvidersFee ?? 0n,
				displayDecimals: $destinationToken.decimals,
				unitName: $destinationToken.decimals
			})
		: '0';

	let liquidityProvidersFee: number;
	$: liquidityProvidersFee = Number(liquidityProvidersFeeDisplay);

	let gasFeeDisplay: string;
	$: gasFeeDisplay = nonNullish($destinationToken)
		? formatTokenAmount({
				value: $swapAmountsStore?.swapAmounts?.gasFee ?? 0n,
				displayDecimals: $destinationToken.decimals,
				unitName: $destinationToken.decimals
			})
		: '0';

	let gasFee: number;
	$: gasFee = Number(gasFeeDisplay);

	let sourceTokenFeeDisplay: string;
	$: sourceTokenFeeDisplay =
		nonNullish($sourceToken) && nonNullish($sourceToken.fee)
			? formatTokenAmount({
					value: $sourceToken.fee,
					displayDecimals: $sourceToken.decimals,
					unitName: $sourceToken.decimals
				})
			: '0';

	let sourceTokenFee: number;
	$: sourceTokenFee = Number(sourceTokenFeeDisplay);

	let destinationTokenTotalFeeUSD: number;
	$: destinationTokenTotalFeeUSD = nonNullish($destinationTokenExchangeRate)
		? (liquidityProvidersFee + gasFee) * $destinationTokenExchangeRate
		: 0;

	let sourceTokenTotalFeeUSD: number;
	$: sourceTokenTotalFeeUSD = nonNullish($sourceTokenExchangeRate)
		? sourceTokenFee * $sourceTokenExchangeRate
		: 0;
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
	<ModalExpandableValues>
		<ModalValue slot="list-header">
			<svelte:fragment slot="label">{$i18n.swap.text.total_fee}</svelte:fragment>

			<svelte:fragment slot="main-value">
				{#if destinationTokenTotalFeeUSD + sourceTokenTotalFeeUSD < SWAP_TOTAL_FEE_THRESHOLD}
					{`< ${formatUSD({
						value: SWAP_TOTAL_FEE_THRESHOLD
					})}`}
				{:else}
					{formatUSD({
						value: destinationTokenTotalFeeUSD + sourceTokenTotalFeeUSD
					})}
				{/if}
			</svelte:fragment>
		</ModalValue>

		<svelte:fragment slot="list-items">
			{#if nonNullish(sourceTokenFee)}
				<ModalValue>
					<svelte:fragment slot="label">{$i18n.swap.text.token_fee}</svelte:fragment>

					<svelte:fragment slot="main-value">
						{sourceTokenFeeDisplay}
						{$sourceToken.symbol}
					</svelte:fragment>
				</ModalValue>
			{/if}

			<ModalValue>
				<svelte:fragment slot="label">{$i18n.swap.text.gas_fee}</svelte:fragment>

				<svelte:fragment slot="main-value">
					{gasFeeDisplay}
					{$destinationToken.symbol}
				</svelte:fragment>
			</ModalValue>

			<ModalValue>
				<svelte:fragment slot="label">{$i18n.swap.text.lp_fee}</svelte:fragment>

				<svelte:fragment slot="main-value">
					{liquidityProvidersFeeDisplay}
					{$destinationToken.symbol}
				</svelte:fragment>
			</ModalValue>
		</svelte:fragment>
	</ModalExpandableValues>
{/if}

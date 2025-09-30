<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { formatToken, formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		amount: bigint;
		usdAmount: number;
		token: IcToken | undefined;
		loading?: boolean;
		testId?: string;
	}

	let { amount, usdAmount, token, loading = true, testId }: Props = $props();

	const displayAmount = $derived(
		formatToken({
			value: amount,
			unitName: token?.decimals,
			displayDecimals: EIGHT_DECIMALS
		})
	);

	const displayUsdAmount = $derived(
		formatCurrency({
			value: usdAmount,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

{#if nonNullish(token)}
	<div
		class={`relative w-1/3 rounded-xl p-2 text-center text-sm text-primary-inverted md:text-base ${amount > ZERO ? 'bg-success-primary' : 'bg-tertiary-inverted'}`}
		class:animate-pulse={loading}
		class:duration-500={loading}
		class:ease-in-out={loading}
		class:transition={loading}
		data-tid={testId}
	>
		{#if amount > ZERO}
			<Sprinkles type="box" />
		{/if}

		<div class="relative grid flex-col justify-items-center">
			<div class="flex justify-center pb-2">
				<TokenLogo data={token} />
			</div>
			<span class="w-full text-sm font-bold">
				{#if loading}
					<div class="relative mb-3"><SkeletonText /></div>
				{:else}
					{`${displayAmount} ${token.symbol}`}
				{/if}
			</span>
			<span class="w-full">
				{#if loading}
					<SkeletonText />
				{:else}
					{displayUsdAmount}
				{/if}
			</span>
		</div>
	</div>
{/if}

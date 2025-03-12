<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { IcToken } from '$icp/types/ic-token';
	import ConfettiImg from '$lib/assets/confetti.png';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import type { AmountString } from '$lib/types/amount';
	import { formatToken, formatUSD } from '$lib/utils/format.utils.js';

	export let amount: BigNumber;
	export let usdAmount: number;
	export let token: IcToken | undefined;
	export let loading = true;

	let displayAmount: AmountString;
	$: displayAmount = formatToken({
		value: amount,
		unitName: token?.decimals,
		displayDecimals: EIGHT_DECIMALS,
		showPlusSign: true
	});

	let displayUsdAmount: string;
	$: displayUsdAmount = formatUSD({ value: usdAmount });
</script>

{#if nonNullish(token)}
	<div
		class="relative w-1/3 rounded-xl bg-success-primary p-2 text-center text-sm text-primary-inverted md:text-base"
		class:transition={loading}
		class:duration-500={loading}
		class:ease-in-out={loading}
		class:animate-pulse={loading}
	>
		<span class="absolute bottom-0 left-0 right-0 top-0 z-0"><Img src={ConfettiImg} /></span>
		<div class="relative grid flex-col justify-items-center">
			<div class="flex justify-center pb-2">
				<TokenLogo data={token} />
			</div>
			<span class="w-full text-sm font-bold">
				{#if loading}
					<div class="relative mb-3"><SkeletonText /></div>
				{:else}
					{`${displayAmount}${token.symbol}`}
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

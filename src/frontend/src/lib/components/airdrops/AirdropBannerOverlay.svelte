<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { goto } from '$app/navigation';
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { networkId } from '$lib/derived/network.derived.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import type { Token } from '$lib/types/token';
	import { isMobile } from '$lib/utils/device.utils.js';
	import { formatUSD } from '$lib/utils/format.utils.js';
	import { networkUrl } from '$lib/utils/nav.utils.js';

	export let token: Token | undefined;
	export let balance: BigNumber | undefined;
	export let usdBalance: number | undefined;
</script>

<div
	class="absolute flex h-full w-full flex-col items-center justify-center gap-2 bg-black/50 text-white sm:gap-4"
>
	{#if nonNullish(token) && nonNullish(balance) && nonNullish(usdBalance)}
		<div class="text-3xl font-semibold sm:text-5xl">
			<Amount amount={balance} decimals={token.decimals} symbol={token.symbol} />
		</div>

		<div class="text-lg sm:text-xl">
			<span>{formatUSD({ value: usdBalance })}</span>
		</div>

		<div>
			<Button
				on:click={async () => {
					await goto(
						networkUrl({
							path: AppPath.Activity,
							networkId: $networkId,
							usePreviousRoute: false,
							fromRoute: null
						})
					);
				}}
				colorStyle="tertiary"
				link
				paddingSmall
			>
				<div class="flex items-center gap-2">
					<IconCoins />
					<span class="text-lg"
						>{isMobile()
							? $i18n.airdrops.text.activity_button_text_short
							: $i18n.airdrops.text.activity_button_text}</span
					>
				</div>
			</Button>
		</div>
	{:else}
		<div class="text-3xl font-semibold sm:text-5xl">
			<span>{$i18n.airdrops.text.no_balance_title}</span>
		</div>

		<div class="text-lg sm:text-xl">
			<span>{$i18n.airdrops.text.no_balance_description}</span>
		</div>
	{/if}
</div>

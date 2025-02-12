<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { onMount } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import IconCoins from '$lib/components/icons/IconCoins.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getAirdrops } from '$lib/services/reward-code.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type {AirdropInfo} from '$lib/types/airdrop';
	import { isMobile } from '$lib/utils/device.utils';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatUSD } from '$lib/utils/format.utils';

	const token = ICP_TOKEN;

	let airdrops: AirdropInfo[] | undefined;
	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		({airdrops} = await getAirdrops({ identity: $authIdentity }));
	});

	let balance: BigNumber | undefined;
	$: balance = nonNullish(airdrops)
		? airdrops?.reduce(
				(total, airdrop) => total.add(BigNumber.from(airdrop.amount)),
				BigNumber.from(0)
			)
		: undefined;

	let exchangeRate: number | undefined;
	$: exchangeRate = $exchanges?.[token.id]?.usd;

	let usdBalance: number | undefined;
	$: usdBalance =
		nonNullish(balance) && nonNullish(exchangeRate)
			? usdValue({ token, balance, exchangeRate })
			: undefined;
</script>

<div class="mb-5 max-h-60 rounded-2xl relative flex items-end overflow-hidden">
	<div class="max-h-60">
		<ImgBanner src={'/images/dapps/kong-swap.webp'} testId={AIRDROPS_MODAL_IMAGE_BANNER} />
	</div>

	<div
		class="gap-2 sm:gap-4 absolute flex h-full w-full flex-col items-center justify-center text-center text-white"
	>
		<div class="text-3xl font-semibold sm:text-5xl">
			{#if nonNullish(balance)}
				<Amount amount={balance} decimals={token.decimals} symbol={token.symbol} />
			{:else}
				<span class="animate-pulse">{'-'}</span>
			{/if}
		</div>

		<div class="text-lg sm:text-xl">
			{#if nonNullish(usdBalance)}
				<span>{formatUSD({ value: usdBalance })}</span>
			{:else}
				<span class="animate-pulse">{'-'}</span>
			{/if}
		</div>

		<div class="flex w-3/5 items-center">
			<Button colorStyle="tertiary" link paddingSmall>
				<div class="gap-2 flex items-center justify-center">
					<IconCoins />
					<span class="text-lg"
						>{isMobile() ? 'Check activity' : $i18n.airdrops.text.activity_button_text}</span
					>
				</div>
			</Button>
		</div>
	</div>
</div>

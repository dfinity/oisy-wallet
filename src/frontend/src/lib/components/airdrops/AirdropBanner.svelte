<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import type { RewardInfo } from '$declarations/rewards/rewards.did';
	import IconCoins from '$lib/components/icons/IconCoins.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getAirdrops } from '$lib/services/reward-code.services';
	import { formatUSD } from '$lib/utils/format.utils';

	let airdrops: RewardInfo[] | undefined;
	let balance: bigint | undefined;
	let usdBalance: number | undefined;

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		airdrops = await getAirdrops({ identity: $authIdentity });
	});

	$: balance = nonNullish(airdrops)
		? airdrops?.reduce((total, airdrop) => BigInt(total) + BigInt(airdrop.amount), BigInt(0))
		: undefined;

	// TODO calculate usdBalance and display
</script>

<div class="relative mb-5 flex max-h-60 items-end overflow-hidden rounded-2xl">
	<div class="max-h-60">
		<ImgBanner src={'/images/dapps/kong-swap.webp'} testId={AIRDROPS_MODAL_IMAGE_BANNER} />
	</div>

	<div
		class="absolute flex h-full w-full flex-col items-center justify-center gap-4 text-center text-white"
	>
		<div class="text-5xl font-semibold">
			{#if nonNullish(balance)}
				<Amount amount={balance} decimals={3} symbol="ICP" />
			{:else}
				<span class="animate-pulse">{'-'}</span>
			{/if}
		</div>
		{#if nonNullish(airdrops)}
			<span class="text-xl">{formatUSD({ value: 1.0 })}</span>
		{:else}
			<span class="animate-pulse text-xl">{'-'}</span>
		{/if}

		<div class="flex w-3/5 items-center">
			<Button colorStyle="tertiary" link paddingSmall>
				<div class="flex flex-col items-center justify-center gap-2 lg:flex-row">
					<IconCoins />
					<span class="text-lg">Check on Recent Activity</span>
				</div>
			</Button>
		</div>
	</div>
</div>

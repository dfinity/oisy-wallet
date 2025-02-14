<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { onMount } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import airdropBanner from '$lib/assets/airdrop-modal-banner.svg';
	import AirdropBannerOverlay from '$lib/components/airdrops/AirdropBannerOverlay.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { getAirdrops } from '$lib/services/reward-code.services';
	import type { AirdropInfo } from '$lib/types/airdrop';
	import { usdValue } from '$lib/utils/exchange.utils';

	const token = ICP_TOKEN;

	let airdrops: AirdropInfo[] | undefined;
	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		({ airdrops } = await getAirdrops({ identity: $authIdentity }));
	});

	let balance: BigNumber | undefined;
	$: balance =
		nonNullish(airdrops) && airdrops.length > 0
			? airdrops?.reduce(
					(total, { amount }) => total.add(BigNumber.from(amount)),
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
		<ImgBanner src={airdropBanner} testId={AIRDROPS_MODAL_IMAGE_BANNER} />
	</div>

	<AirdropBannerOverlay {token} {balance} {usdBalance} />
</div>

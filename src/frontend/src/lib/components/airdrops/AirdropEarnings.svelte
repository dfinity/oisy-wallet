<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import type { IcToken } from '$icp/types/ic-token';
	import { getUserRewardsTokenAmounts } from '$lib/api/reward.api';
	import AirdropEarningsCard from '$lib/components/airdrops/AirdropEarningsCard.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatUSD } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { calculateTokenUsdAmount, findTwinToken } from '$lib/utils/token.utils';
	import Button from '$lib/components/ui/Button.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { authIdentity } from '$lib/derived/auth.derived';

	import type { Token } from '$lib/types/token';

	export let isEligible = false;

	let ckBtcToken: IcToken | undefined;
	$: ckBtcToken = findTwinToken({ tokenToPair: BTC_MAINNET_TOKEN, tokens: $tokens });
	let ckBtcReward: BigNumber;
	$: ckBtcReward = ZERO;
	let ckBtcRewardUsd: number;
	$: ckBtcRewardUsd = nonNullish(ckBtcToken)
		? (calculateTokenUsdAmount({ amount: ckBtcReward, token: ckBtcToken as Token, $exchanges }) ??
			0)
		: 0;

	let ckUsdcToken: IcToken | undefined;
	$: ckUsdcToken = findTwinToken({ tokenToPair: USDC_TOKEN, tokens: $tokens });
	let ckUsdcReward: BigNumber;
	$: ckUsdcReward = ZERO;
	let ckUsdcRewardUsd: number;
	$: ckUsdcRewardUsd = nonNullish(ckBtcToken)
		? (calculateTokenUsdAmount({ amount: ckUsdcReward, token: ckUsdcToken as Token, $exchanges }) ??
			0)
		: 0;

	let icpToken: IcToken | undefined;
	$: icpToken = ICP_TOKEN;
	let icpReward: BigNumber;
	$: icpReward = ZERO;
	let icpRewardUsd: number;
	$: icpRewardUsd = nonNullish(ckBtcToken)
		? (calculateTokenUsdAmount({ amount: icpReward, token: icpToken as Token, $exchanges }) ?? 0)
		: 0;

	let totalRewardUsd: number;
	$: totalRewardUsd = ckBtcRewardUsd + ckUsdcRewardUsd + icpRewardUsd;

	let loading: boolean;
	$: loading = true;

	const loadRewards = async ({
		ckBtcToken,
		ckUsdcToken,
		icpToken
	}: {
		ckBtcToken: IcToken | undefined;
		ckUsdcToken: IcToken | undefined;
		icpToken: IcToken | undefined;
	}) => {
		if (isNullish(ckBtcToken) || isNullish(ckUsdcToken) || isNullish(icpToken)) return;

		const result = await getUserRewardsTokenAmounts({
			ckBtcToken,
			ckUsdcToken,
			icpToken,
			$authIdentity
		});

		ckBtcReward = result.ckBtcReward;
		ckUsdcReward = result.ckUsdcReward;
		icpReward = result.icpReward;
		loading = false;
	};

	$: loadRewards({ ckBtcToken, ckUsdcToken, icpToken });

	const gotoActivity = async () => {
		await goto(
			networkUrl({
				path: AppPath.Activity,
				networkId: $networkId,
				usePreviousRoute: false,
				fromRoute: null
			})
		);
	};
</script>

{#if isEligible}
	<div transition:fade={SLIDE_DURATION}>
		<div
			class="mb-5 mt-2 w-full text-center text-xl font-bold text-success-primary"
			class:transition={loading}
			class:duration-500={loading}
			class:ease-in-out={loading}
			class:animate-pulse={loading}
			>{replacePlaceholders($i18n.airdrops.text.sprinkles_earned, {
				$noOfSprinkles: '3',
				$amount: formatUSD({ value: totalRewardUsd })
			})}
		</div>

		<div class="flex w-full gap-2">
			<AirdropEarningsCard
				{loading}
				token={ckBtcToken}
				amount={ckBtcReward}
				usdAmount={ckBtcRewardUsd}
			/>
			<AirdropEarningsCard
				{loading}
				token={ckUsdcToken}
				amount={ckUsdcReward}
				usdAmount={ckUsdcRewardUsd}
			/>
			<AirdropEarningsCard {loading} token={icpToken} amount={icpReward} usdAmount={icpRewardUsd} />
		</div>

		<div class="my-5 w-full justify-items-center text-center">
			<Button
				paddingSmall
				on:click={gotoActivity}
				styleClass="font-semibold bg-transparent text-brand-primary-alt"
			>
				{isMobile()
					? $i18n.airdrops.text.activity_button_text_short
					: $i18n.airdrops.text.activity_button_text}
			</Button>
		</div>
	</div>

	<Hr spacing="md" />
{/if}

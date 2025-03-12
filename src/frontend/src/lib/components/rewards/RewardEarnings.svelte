<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import type { IcToken } from '$icp/types/ic-token';
	import RewardEarningsCard from '$lib/components/rewards/RewardEarningsCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getUserRewardsTokenAmounts } from '$lib/services/reward-code.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatUSD } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { calculateTokenUsdAmount, findTwinToken } from '$lib/utils/token.utils';

	export let isEligible = false;

	let ckBtcToken: IcToken | undefined;
	$: ckBtcToken = findTwinToken({ tokenToPair: BTC_MAINNET_TOKEN, tokens: $tokens });
	let ckBtcReward: BigNumber;
	$: ckBtcReward = ZERO;
	let ckBtcRewardUsd: number;
	$: ckBtcRewardUsd = nonNullish(ckBtcToken)
		? (calculateTokenUsdAmount({
				amount: ckBtcReward,
				token: ckBtcToken,
				$exchanges: $exchanges
			}) ?? 0)
		: 0;

	let ckUsdcToken: IcToken | undefined;
	$: ckUsdcToken = findTwinToken({ tokenToPair: USDC_TOKEN, tokens: $tokens });
	let ckUsdcReward: BigNumber;
	$: ckUsdcReward = ZERO;
	let ckUsdcRewardUsd: number;
	$: ckUsdcRewardUsd = nonNullish(ckUsdcToken)
		? (calculateTokenUsdAmount({
				amount: ckUsdcReward,
				token: ckUsdcToken,
				$exchanges: $exchanges
			}) ?? 0)
		: 0;

	let icpToken: IcToken | undefined;
	$: icpToken = ICP_TOKEN;
	let icpReward: BigNumber;
	$: icpReward = ZERO;
	let icpRewardUsd: number;
	$: icpRewardUsd = nonNullish(icpToken)
		? (calculateTokenUsdAmount({ amount: icpReward, token: icpToken, $exchanges: $exchanges }) ?? 0)
		: 0;

	let totalRewardUsd: number;
	$: totalRewardUsd = ckBtcRewardUsd + ckUsdcRewardUsd + icpRewardUsd;

	let amountOfRewards: number;
	$: amountOfRewards = 0;

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
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(ckBtcToken) || isNullish(ckUsdcToken) || isNullish(icpToken)) {
			return;
		}

		({ ckBtcReward, ckUsdcReward, icpReward, amountOfRewards } = await getUserRewardsTokenAmounts({
			ckBtcToken,
			ckUsdcToken,
			icpToken,
			identity: $authIdentity
		}));
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
			>{replacePlaceholders($i18n.rewards.text.sprinkles_earned, {
				$noOfSprinkles: amountOfRewards.toString(),
				$amount: formatUSD({ value: totalRewardUsd })
			})}
		</div>

		<div class="flex w-full gap-2">
			<RewardEarningsCard
				{loading}
				token={ckBtcToken}
				amount={ckBtcReward}
				usdAmount={ckBtcRewardUsd}
			/>
			<RewardEarningsCard
				{loading}
				token={ckUsdcToken}
				amount={ckUsdcReward}
				usdAmount={ckUsdcRewardUsd}
			/>
			<RewardEarningsCard {loading} token={icpToken} amount={icpReward} usdAmount={icpRewardUsd} />
		</div>

		<div class="my-5 w-full justify-items-center text-center">
			<Button
				paddingSmall
				on:click={gotoActivity}
				styleClass="font-semibold bg-transparent text-brand-primary-alt"
			>
				{isMobile()
					? $i18n.rewards.text.activity_button_text_short
					: $i18n.rewards.text.activity_button_text}
			</Button>
		</div>
	</div>
{/if}

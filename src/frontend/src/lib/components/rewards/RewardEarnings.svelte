<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { ICP_SYMBOL, ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import type { IcToken } from '$icp/types/ic-token';
	import RewardEarningsCard from '$lib/components/rewards/RewardEarningsCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		REWARDS_EARNINGS_ACTIVITY_BUTTON,
		REWARDS_EARNINGS_CARD
	} from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getUserRewardsTokenAmounts } from '$lib/services/reward.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { calculateTokenUsdAmount, findTwinToken } from '$lib/utils/token.utils';

	interface Props {
		reward: RewardCampaignDescription;
		amountOfRewards?: number;
	}

	let { reward, amountOfRewards = $bindable(0) }: Props = $props();

	let ckBtcReward = $state(ZERO);
	const ckBtcToken = $derived(findTwinToken({ tokenToPair: BTC_MAINNET_TOKEN, tokens: $tokens }));
	const ckBtcRewardUsd = $derived(
		nonNullish(ckBtcToken)
			? (calculateTokenUsdAmount({
					amount: ckBtcReward,
					token: ckBtcToken,
					$exchanges
				}) ?? 0)
			: 0
	);

	let ckUsdcReward = $state(ZERO);
	const ckUsdcToken = $derived(findTwinToken({ tokenToPair: USDC_TOKEN, tokens: $tokens }));
	const ckUsdcRewardUsd = $derived(
		nonNullish(ckUsdcToken)
			? (calculateTokenUsdAmount({
					amount: ckUsdcReward,
					token: ckUsdcToken,
					$exchanges
				}) ?? 0)
			: 0
	);

	let icpReward = $state(ZERO);
	const icpRewardUsd = $derived(
		calculateTokenUsdAmount({
			amount: icpReward,
			token: ICP_TOKEN,
			$exchanges
		}) ?? 0
	);

	const totalRewardUsd = $derived(ckBtcRewardUsd + ckUsdcRewardUsd + icpRewardUsd);

	let loadingRewards = $state(true);

	const loadRewards = async ({
		ckBtcToken,
		ckUsdcToken,
		icpToken
	}: {
		ckBtcToken: IcToken | undefined;
		ckUsdcToken: IcToken | undefined;
		icpToken: IcToken | undefined;
	}) => {
		loadingRewards = true;

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
			identity: $authIdentity,
			campaignId: reward.id
		}));

		loadingRewards = false;
	};

	onMount(() => {
		loadRewards({ ckBtcToken, ckUsdcToken, icpToken: ICP_TOKEN });
	});

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

	let amount = $derived(
		formatCurrency({
			value: totalRewardUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	let loadingAmount = $derived(isNullish(amount));

	let loading = $derived(loadingRewards || loadingAmount);
</script>

{#if amountOfRewards > 0}
	<div transition:fade={SLIDE_DURATION}>
		<div
			class="mb-5 mt-2 w-full text-center text-xl font-bold text-success-primary"
			class:animate-pulse={loading}
			class:duration-500={loading}
			class:ease-in-out={loading}
			class:transition={loading}
			>{replacePlaceholders($i18n.rewards.text.sprinkles_earned, {
				$noOfSprinkles: amountOfRewards.toString(),
				$amount: amount ?? ''
			})}
		</div>

		<div class="flex w-full gap-2">
			<RewardEarningsCard
				amount={ckBtcReward}
				{loading}
				testId={`${REWARDS_EARNINGS_CARD}-${BTC_MAINNET_TOKEN.twinTokenSymbol}`}
				token={ckBtcToken}
				usdAmount={ckBtcRewardUsd}
			/>
			<RewardEarningsCard
				amount={ckUsdcReward}
				{loading}
				testId={`${REWARDS_EARNINGS_CARD}-${USDC_TOKEN.twinTokenSymbol}`}
				token={ckUsdcToken}
				usdAmount={ckUsdcRewardUsd}
			/>
			<RewardEarningsCard
				amount={icpReward}
				{loading}
				testId={`${REWARDS_EARNINGS_CARD}-${ICP_SYMBOL}`}
				token={ICP_TOKEN}
				usdAmount={icpRewardUsd}
			/>
		</div>

		<div class="my-5 w-full justify-items-center text-center">
			<Button
				onclick={gotoActivity}
				paddingSmall
				styleClass="font-semibold bg-transparent text-brand-primary-alt"
				testId={REWARDS_EARNINGS_ACTIVITY_BUTTON}
			>
				{isMobile()
					? $i18n.rewards.text.activity_button_text_short
					: $i18n.rewards.text.activity_button_text}
			</Button>
		</div>
	</div>
{/if}

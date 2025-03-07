<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import type { IcToken } from '$icp/types/ic-token';
	import { getUserInfo } from '$lib/api/reward.api';
	import AirdropEarningsCard from '$lib/components/airdrops/AirdropEarningsCard.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isMobile } from '$lib/utils/device.utils';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatUSD } from '$lib/utils/format.utils.js';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { networkUrl } from '$lib/utils/nav.utils';

	export let isEligible = false;

	const getUsdAmount = (amount: BigNumber, token?: IcToken) => {
		if (isNullish(amount) || isNullish(token)) {return 0;}
		const exchangeRate = $exchanges?.[token.id]?.usd;
		return nonNullish(exchangeRate)
			? usdValue({ decimals: token.decimals, balance: amount, exchangeRate })
			: 0;
	};

	let ckBtcToken: IcToken | undefined;
	$: ckBtcToken = $icrcTokens.find((t) => t.symbol.match(new RegExp(`(ck)(.*)?(BTC)+`, 'gi')));
	let ckBtcReward: BigNumber;
	$: ckBtcReward = BigNumber.from(0);
	let ckBtcRewardUsd: number;
	$: ckBtcRewardUsd = getUsdAmount(ckBtcReward, ckBtcToken);

	let ckUsdcToken: IcToken | undefined;
	$: ckUsdcToken = $icrcTokens.find((t) => t.symbol.match(new RegExp(`(ck)(.*)?(USDC)+`, 'gi')));
	let ckUsdcReward: BigNumber;
	$: ckUsdcReward = BigNumber.from(0);
	let ckUsdcRewardUsd: number;
	$: ckUsdcRewardUsd = getUsdAmount(ckUsdcReward, ckUsdcToken);

	let icpToken: IcToken | undefined;
	$: icpToken = ICP_TOKEN;
	let icpReward: BigNumber;
	$: icpReward = BigNumber.from(0);
	let icpRewardUsd: number;
	$: icpRewardUsd = getUsdAmount(icpReward, icpToken);

	let totalRewardUsd: number;
	$: totalRewardUsd = ckBtcRewardUsd + ckUsdcRewardUsd + icpRewardUsd;

	let loading: boolean;
	$: loading = true;

	const loadUserRewardsInfo = async (
		ckBtcToken: IcToken | undefined,
		ckUsdcToken: IcToken | undefined,
		icpToken: IcToken | undefined
	) => {
		if (isNullish(ckBtcToken) || isNullish(ckUsdcToken) || isNullish(icpToken)) {return;}
		const data = await getUserInfo({ identity: $authIdentity });

		let _ckBtcReward: BigNumber = BigNumber.from(0);
		let _ckUsdcReward: BigNumber = BigNumber.from(0);
		let _icpReward: BigNumber = BigNumber.from(0);

		for (let i = 0; i < (data.usage_awards[0] ?? []).length; i++) {
			const aw = data.usage_awards[0]?.[i];
			if (nonNullish(aw)) {
				const canisterId = aw.ledger.toText();
				if (ckBtcToken.ledgerCanisterId === canisterId) {
					_ckBtcReward = BigNumber.from(_ckBtcReward).add(aw.amount);
				} else if (icpToken.ledgerCanisterId === canisterId) {
					_icpReward = BigNumber.from(_icpReward).add(aw.amount);
				} else if (ckUsdcToken.ledgerCanisterId === canisterId) {
					_ckUsdcReward = BigNumber.from(_ckUsdcReward).add(aw.amount);
				} else {
					console.warn(`Ledger canister mapping not found for: ${  canisterId}`);
				}
			}
		}

		ckBtcReward = _ckBtcReward;
		ckUsdcReward = _ckUsdcReward;
		icpReward = _icpReward;
		loading = false;
	};

	$: loadUserRewardsInfo(ckBtcToken, ckUsdcToken, icpToken);
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
			<button
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
				class=" font-semibold text-brand-primary-alt"
			>
				{isMobile()
					? $i18n.airdrops.text.activity_button_text_short
					: $i18n.airdrops.text.activity_button_text}
			</button>
		</div>
	</div>

	<Hr spacing="md" />
{/if}

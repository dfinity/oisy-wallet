<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { loadDisabledIcrcTokensExchanges } from '$icp/services/icrc.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import ClaimStakingRewardModal from '$lib/components/stake/ClaimStakingRewardModal.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import StakeRewardToken from '$lib/components/stake/StakeRewardToken.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		modalGldtClaimStakingReward,
		modalGldtClaimStakingRewardData
	} from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { StakeProvider } from '$lib/types/stake';

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let rewardTokensData = $derived(
		$gldtStakeStore?.position?.claimable_rewards?.reduce<Record<string, bigint>>((acc, reward) => {
			const [tokenSymbolObject, amount] = reward;
			const [tokenSymbol] = Object.keys(tokenSymbolObject);

			return { ...acc, [tokenSymbol]: amount };
		}, {}) ?? {}
	);

	let rewardTokens = $derived(
		$icrcTokens.filter(({ symbol }) => Object.keys(rewardTokensData).includes(symbol))
	);

	const loadMissingExchanges = async () => {
		const disabledRewardTokens = rewardTokens.filter(
			({ enabled, symbol, id }) =>
				!enabled && rewardTokensData[symbol] > ZERO && isNullish($exchanges?.[id]?.usd)
		);

		if (disabledRewardTokens.length > 0) {
			await loadDisabledIcrcTokensExchanges({
				disabledIcrcTokens: disabledRewardTokens
			});
		}
	};

	const debounceLoadMissingExchanges = debounce(loadMissingExchanges, 1000);

	$effect(() => {
		[rewardTokens];

		debounceLoadMissingExchanges();
	});
</script>

{#if nonNullish($gldtStakeStore?.position) && rewardTokens.length > 0}
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.stake.text.unclaimed_rewards}</h4>
		{/snippet}

		{#snippet content()}
			{#each rewardTokens as token, index (index)}
				<StakeRewardToken amount={rewardTokensData[token.symbol]} {token} />
			{/each}
		{/snippet}
	</StakeContentSection>
{/if}

{#if $modalGldtClaimStakingReward && nonNullish($modalGldtClaimStakingRewardData)}
	<ClaimStakingRewardModal {...$modalGldtClaimStakingRewardData} provider={StakeProvider.GLDT} />
{/if}

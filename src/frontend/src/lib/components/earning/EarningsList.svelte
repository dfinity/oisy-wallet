<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import EarningCard from '$lib/components/earning/EarningCard.svelte';
	import NoStakePlaceholder from '$lib/components/stake/NoStakePlaceholder.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { enabledFungibleTokens } from '$lib/derived/tokens.derived';
	import type { ProviderUi } from '$lib/types/provider-ui';
	import { StakeProvider } from '$lib/types/stake';
	import { calculateTokenUsdAmount } from '$lib/utils/token.utils';

	// TODO: this logic is very custom-made for the current single provider. Improve it to be more generic: each provider has a feature (for example earning), and each feature a sub-group (for example staking), and each sub-group has a list of objects to which it applies (like tokens).
	let earningProvidersUi = $derived(
		Object.entries(stakeProvidersConfig).reduce<ProviderUi[]>((acc, [providerName, config]) => {
			if (providerName === StakeProvider.GLDT) {
				const gldtToken = $enabledFungibleTokens.find(isGLDTToken);


				const gldtStakePosition = $gldtStakeStore?.position?.staked ?? ZERO;

				const gldtStakePositionUsd = nonNullish(gldtToken)
					? (calculateTokenUsdAmount({
							amount: gldtStakePosition,
							token: gldtToken,
							$exchanges
						}) ?? 0)
					: 0;

				const gldtStakeApy = $gldtStakeStore?.apy ?? 0;

				const gldtStakeEarningPerYear = (gldtStakePositionUsd * gldtStakeApy) / 100;

				const providerUi = {
					...config,
					// TODO: improve this flow to calculate the max APY among all possible earning features of the provider
					maxApy: gldtStakeApy,
					totalEarningPerYear: gldtStakeEarningPerYear,
					// TODO: improve this flow to calculate the sum of all positions among all possible earning features of the provider
					totalPositionUsd: gldtStakePositionUsd,
					tokens: [...(nonNullish(gldtToken) ? [gldtToken] : [])]
				};

				acc.push(providerUi);
			}

			return acc;
		}, [])
	);

	let filteredEarningProviders = $derived(
		earningProvidersUi.filter(({ totalPositionUsd }) => totalPositionUsd !== 0)
	);
</script>

<!-- TODO: add a skeleton -->
<div class="flex flex-col gap-3">
	{#each filteredEarningProviders as provider (provider.name)}
		<div class="overflow-hidden rounded-xl" transition:fade>
			<EarningCard {provider} />
		</div>
	{/each}

	{#if filteredEarningProviders.length === 0}
		<NoStakePlaceholder />
	{/if}
</div>

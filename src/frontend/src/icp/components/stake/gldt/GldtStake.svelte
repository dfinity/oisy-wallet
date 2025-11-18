<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { setContext } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { EARNING_ENABLED } from '$env/earning';
	import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
	import GldtStakeEarnCard from '$icp/components/stake/gldt/GldtStakeEarnCard.svelte';
	import GldtStakePositionCard from '$icp/components/stake/gldt/GldtStakePositionCard.svelte';
	import GldtStakeRewards from '$icp/components/stake/gldt/GldtStakeRewards.svelte';
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext as GldtStakeContextType,
		gldtStakeStore
	} from '$icp/stores/gldt-stake.store';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { StakeProvider } from '$lib/types/stake';
	import { networkUrl } from '$lib/utils/nav.utils';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: gldtStakeStore
	});

	let gldtToken = $derived($enabledIcrcTokens.find(isGLDTToken));
</script>

<GldtStakeContext>
	<StakeProviderContainer currentApy={$gldtStakeStore?.apy} provider={StakeProvider.GLDT}>
		{#snippet backButton()}
			{#if EARNING_ENABLED}
				<ButtonIcon
					ariaLabel="icon"
					colorStyle="tertiary"
					link={false}
					onclick={() =>
						goto(
							networkUrl({
								path: AppPath.Earning,
								networkId: $networkId,
								usePreviousRoute: true,
								fromRoute
							})
						)}
				>
					{#snippet icon()}
						<IconBackArrow />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}

		{#snippet content()}
			<div class="mt-6 flex flex-col justify-between gap-4 sm:flex-row">
				<GldtStakeEarnCard {gldtToken} />
				<GldtStakePositionCard {gldtToken} />
			</div>
		{/snippet}
	</StakeProviderContainer>

	<div class="my-8">
		<GldtStakeRewards />
	</div>
</GldtStakeContext>

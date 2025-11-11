<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount, setContext } from 'svelte';
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
		initGldtStakeStore
	} from '$icp/stores/gldt-stake.store';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { StakeProvider } from '$lib/types/stake';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { GldtToken } from './gldtToken';
	import { balancesStore } from '$lib/stores/balances.store';

	BigInt.prototype.toJSON = function () {
		return `${Number(this)}n`;
	};

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	const { store: gldtStakeStore } = setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: initGldtStakeStore()
	});

	let gldtToken = $derived(GldtToken /*$enabledIcrcTokens.find(isGLDTToken)*/);

	onMount(() => {
		balancesStore.set({ id: gldtToken.id, data: { data: 40000000000n, certified: true } });
	});
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

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
		initGldtStakeStore
	} from '$icp/stores/gldt-stake.store';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { networkUrl } from '$lib/utils/nav.utils';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: initGldtStakeStore()
	});

	let gldtToken = $derived($enabledIcrcTokens.find(isGLDTToken));
</script>

<div class="flex flex-row items-center">
	{#if EARNING_ENABLED}
		<ButtonIcon
			ariaLabel="icon"
			colorStyle="secondary-light"
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
			styleClass="mr-3"
		>
			{#snippet icon()}
				<IconBackArrow />
			{/snippet}
		</ButtonIcon>
	{/if}

	<PageTitle>{$i18n.earning.cards.gold_description}</PageTitle>
</div>

<GldtStakeContext>
	<div class="flex justify-between gap-4">
		<GldtStakeEarnCard {gldtToken} />
		<GldtStakePositionCard {gldtToken} />
	</div>

	<div class="my-8">
		<GldtStakeRewards />
	</div>
</GldtStakeContext>

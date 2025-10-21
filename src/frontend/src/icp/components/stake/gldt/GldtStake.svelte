<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { setContext } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { EARNING_ENABLED } from '$env/earning';
	import GldtStakeApyContext from '$icp/components/stake/gldt/GldtStakeApyContext.svelte';
	import GldtStakeEarnCard from '$icp/components/stake/gldt/GldtStakeEarnCard.svelte';
	import {
		GLDT_STAKE_APY_CONTEXT_KEY,
		type GldtStakeApyContext as GldtStakeApyContextType,
		initGldtStakeApyStore
	} from '$icp/stores/gldt-stake-apy.store';
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

	setContext<GldtStakeApyContextType>(GLDT_STAKE_APY_CONTEXT_KEY, {
		store: initGldtStakeApyStore()
	});
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

<GldtStakeApyContext>
	<GldtStakeEarnCard />
</GldtStakeApyContext>

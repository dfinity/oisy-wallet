<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount, tick } from 'svelte';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ReceiveBackButton from '$lib/components/receive/ReceiveBackButton.svelte';
	import ReceiveTestNetworkBadge from '$lib/components/receive/ReceiveTestNetworkBadge.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { RECEIVE_ROUTE_LIST_ITEM } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveRoute } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		getReceiveRouteOptionTexts,
		isReceiveConversionOffer,
		isReceiveTestToken
	} from '$lib/utils/receive.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		// Every version of the picked asset.
		assetTokens: Token[];
		routes: ReceiveRoute[];
		selectedKey?: string;
		// The token picker was shown before this step, so Back returns to it.
		tokenStepVisited: boolean;
		onSelect: (route: ReceiveRoute) => void;
		onChangeToken: () => void;
	}

	let {
		token,
		assetTokens,
		routes,
		selectedKey,
		tokenStepVisited,
		onSelect,
		onChangeToken
	}: Props = $props();

	// A route that credits another asset than the one picked, such as BTC deposited as ckBTC.
	const isOffer = (route: ReceiveRoute): boolean =>
		isReceiveConversionOffer({ route, assetTokens });

	let withDepositOffer = $derived(
		routes.some((route) => route.kind === 'ckbtc-deposit' && isOffer(route))
	);

	const optionTexts = (route: ReceiveRoute) =>
		getReceiveRouteOptionTexts({
			route,
			assetTokens,
			withDepositOffer,
			confirmations: $ckBtcMinterInfoStore?.[route.creditedToken.id]?.data.min_confirmations,
			i18n: $i18n
		});

	let buttons = $state<Record<string, HTMLButtonElement | undefined>>({});

	// The choice made here before (on Back) takes focus, else the first route, so Enter repeats it.
	onMount(async () => {
		await tick();

		const [first] = routes;

		(buttons[selectedKey ?? ''] ?? buttons[first?.key ?? ''])?.focus({ preventScroll: true });
	});
</script>

{#if routes.length === 0}
	<p class="py-4 text-primary">
		{replacePlaceholders($i18n.receive.token.text.no_routes, {
			$token: getTokenDisplaySymbol(token)
		})}
	</p>
{:else}
	<List noPadding>
		{#each routes as route (route.key)}
			{@const texts = optionTexts(route)}
			{#snippet routeDescription()}
				{texts.description}
			{/snippet}
			<ListItem styleClass="first-of-type:border-t-1">
				<LogoButton
					description={nonNullish(texts.description) ? routeDescription : undefined}
					dividers
					fullWidth
					onClick={() => onSelect(route)}
					selected={selectedKey === route.key ? true : undefined}
					testId={`${RECEIVE_ROUTE_LIST_ITEM}-${route.key}`}
					bind:button={buttons[route.key]}
				>
					{#snippet logo()}
						<div class="mr-2">
							<TokenLogo
								badge={{ type: 'network' }}
								color="white"
								data={isOffer(route) ? route.creditedToken : route.sourceToken}
								logoSize="lg"
							/>
						</div>
					{/snippet}

					{#snippet title()}
						{texts.title}
					{/snippet}

					{#snippet descriptionEnd()}
						{#if isReceiveTestToken(route.creditedToken)}
							<ReceiveTestNetworkBadge />
						{/if}
					{/snippet}
				</LogoButton>
			</ListItem>
		{/each}
	</List>
{/if}

<div class="mt-6">
	<ButtonGroup>
		<ReceiveBackButton back={tokenStepVisited} onclick={onChangeToken} />
	</ButtonGroup>
</div>

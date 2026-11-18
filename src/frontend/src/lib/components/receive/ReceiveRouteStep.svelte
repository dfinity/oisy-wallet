<script lang="ts">
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		RECEIVE_CHANGE_TOKEN_BUTTON,
		RECEIVE_ROUTE_LIST_ITEM
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveRoute } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isReceiveTestToken } from '$lib/utils/receive.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		routes: ReceiveRoute[];
		selectedKey?: string;
		// The token picker was shown before this step, so Back returns to it.
		tokenStepVisited: boolean;
		onSelect: (route: ReceiveRoute) => void;
		onChangeToken: () => void;
	}

	let { token, routes, selectedKey, tokenStepVisited, onSelect, onChangeToken }: Props = $props();

	const routeDescription = ({ kind, sourceToken, sourceNetwork, creditedToken }: ReceiveRoute) =>
		kind === 'ckbtc-deposit'
			? replacePlaceholders($i18n.receive.token.text.route_ckbtc_deposit, {
					$sourceToken: getTokenDisplaySymbol(sourceToken),
					$creditedToken: getTokenDisplaySymbol(creditedToken)
				})
			: replacePlaceholders($i18n.receive.token.text.route_direct, {
					$token: getTokenDisplaySymbol(sourceToken),
					$network: sourceNetwork.name
				});
</script>

{#if routes.length === 0}
	<p class="py-4 text-primary">
		{replacePlaceholders($i18n.receive.token.text.no_routes, {
			$token: getTokenDisplaySymbol(token)
		})}
	</p>
{:else}
	<p class="mb-3 text-tertiary">{$i18n.receive.token.text.which_network}</p>

	<List noPadding>
		{#each routes as route (route.key)}
			<ListItem styleClass="first-of-type:border-t-1">
				<LogoButton
					dividers
					fullWidth
					onClick={() => onSelect(route)}
					selected={selectedKey === route.key ? true : undefined}
					testId={`${RECEIVE_ROUTE_LIST_ITEM}-${route.key}`}
				>
					{#snippet logo()}
						<div class="mr-2">
							<TokenLogo
								badge={{ type: 'network' }}
								color="white"
								data={route.sourceToken}
								logoSize="lg"
							/>
						</div>
					{/snippet}

					{#snippet title()}
						{route.sourceNetwork.name}
					{/snippet}

					{#snippet description()}
						{routeDescription(route)}
					{/snippet}

					{#snippet descriptionEnd()}
						{#if isReceiveTestToken(route.creditedToken)}
							<Badge variant="warning" width="w-fit">
								{$i18n.receive.token.text.test_network}
							</Badge>
						{/if}
					{/snippet}
				</LogoButton>
			</ListItem>
		{/each}
	</List>
{/if}

<div class="mt-6">
	<ButtonGroup>
		{#if tokenStepVisited}
			<ButtonBack fullWidth onclick={onChangeToken} />
		{:else}
			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={onChangeToken}
				testId={RECEIVE_CHANGE_TOKEN_BUTTON}
			>
				{$i18n.receive.token.text.change_token}
			</Button>
		{/if}
	</ButtonGroup>
</div>

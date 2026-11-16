<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import {
		SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
		SWAP_RECEIVE_SHORTCUT_KEEP,
		SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK,
		SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
		SWAP_RECEIVE_SHORTCUTS
	} from '$lib/constants/test-ids.constants';
	import { crossChainSwapNetworksMainnets } from '$lib/derived/cross-chain-networks.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import {
		trackSwapReceiveShortcut,
		type SwapReceiveShortcutAction
	} from '$lib/services/swap-receive-shortcut-analytics.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SwapReceiveShortcutsContext } from '$lib/stores/swap-receive-shortcuts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token } from '$lib/types/token';
	import { formatList, replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		getReceiveShortcuts,
		getReceiveSwapTokens,
		sortSwapListTokens
	} from '$lib/utils/swap.utils';
	import { getTokenDisplaySymbol, mapTokenUi } from '$lib/utils/token.utils';

	interface Props {
		sourceToken: Token;
		navigation: SwapReceiveShortcutsContext;
		// Today's empty receive field, shown while there is nothing to offer yet, or nothing at all.
		emptyField: Snippet;
	}

	let { sourceToken, navigation, emptyField }: Props = $props();

	const { receiveSupportedData, keptDestinationToken, setDestinationToken } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// The receive list's set, in the list's order, so a preview names what the list shows first.
	let tokens = $derived(
		sortSwapListTokens({
			tokens: getReceiveSwapTokens({
				sourceToken,
				supportedData: $receiveSupportedData,
				networks: $crossChainSwapNetworksMainnets,
				tokens: $allSwapUniverseTokens
			}).map((token) =>
				mapTokenUi({ token, $balances: $balancesStore, $stakeBalances, $exchanges })
			),
			$tokensToPin,
			$networksToPin: $networks
		})
	);

	// Only once the providers have answered for this pay token: before that the set is every token,
	// and the counts would be wrong.
	let shortcuts = $derived(
		nonNullish($receiveSupportedData)
			? getReceiveShortcuts({ sourceToken, tokens, networks: $networks })
			: undefined
	);

	let { sameNetwork, otherNetwork, anyToken } = $derived(shortcuts ?? {});

	let visible = $derived(
		nonNullish(sameNetwork) || nonNullish(otherNetwork) || nonNullish(anyToken)
	);

	// Up to `max` names, then "N more" in their place.
	const preview = ({ items, max }: { items: string[]; max: number }): string =>
		formatList({
			items:
				items.length <= max
					? items
					: [
							...items.slice(0, max),
							replacePlaceholders($i18n.swap.text.receive_shortcut_more, {
								$count: `${items.length - max}`
							})
						],
			language: $currentLanguage
		});

	let sameNetworkDetail = $derived(
		preview({ items: (sameNetwork?.tokens ?? []).map(getTokenDisplaySymbol), max: 3 })
	);

	let otherNetworkDetail = $derived.by(() => {
		if (isNullish(otherNetwork)) {
			return '';
		}

		const {
			group: { symbol },
			tokens: [first, ...rest]
		} = otherNetwork;

		// A single token there that goes by another name, ckBTC for BTC, is named.
		if (rest.length === 0 && getTokenDisplaySymbol(first) !== symbol) {
			return replacePlaceholders($i18n.swap.text.receive_shortcut_one_network_as, {
				$network: first.network.name,
				$symbol: getTokenDisplaySymbol(first)
			});
		}

		// One name per network, should a group ever have two tokens on one.
		const names = otherNetwork.tokens.map(({ network: { name } }) => name);

		return preview({ items: names.filter((name, index) => names.indexOf(name) === index), max: 2 });
	});

	let anyTokenDetail = $derived(
		isNullish(anyToken)
			? ''
			: anyToken.tokens === 1
				? $i18n.swap.text.receive_shortcut_any_token_count_single
				: replacePlaceholders(
						anyToken.networks === 1
							? $i18n.swap.text.receive_shortcut_any_token_count_one
							: $i18n.swap.text.receive_shortcut_any_token_count,
						{ $tokens: `${anyToken.tokens}`, $networks: `${anyToken.networks}` }
					)
	);

	const track = ({
		action,
		destinationToken
	}: {
		action: SwapReceiveShortcutAction;
		destinationToken?: Token;
	}) => trackSwapReceiveShortcut({ action, sourceToken, destinationToken });

	const onSameNetwork = () => {
		track({ action: 'same_network' });

		navigation.showReceiveList(sourceToken.network);
	};

	// One network has nothing to choose between, so it is set right away; the step and its pick are
	// tracked there.
	const onOtherNetwork = () => {
		if (otherNetwork?.tokens.length !== 1) {
			navigation.showMoveStep();

			return;
		}

		const [token] = otherNetwork.tokens;

		track({ action: 'other_network', destinationToken: token });

		setDestinationToken(token);
	};

	const onAnyToken = () => {
		track({ action: 'any_token' });

		navigation.showReceiveList(undefined);
	};

	const onKeep = () => {
		if (isNullish($keptDestinationToken)) {
			return;
		}

		track({ action: 'keep' });

		setDestinationToken($keptDestinationToken);
	};
</script>

{#snippet row({
	testId,
	title,
	detail,
	icon,
	onclick
}: {
	testId: string;
	title: string;
	detail: string;
	icon: Snippet;
	onclick: () => void;
})}
	<li>
		<!-- Styled as the Smart Swap cell (SwapProviderCell), on the card's own background. -->
		<button
			class="flex w-full items-center gap-3 rounded-lg border border-tertiary bg-primary px-4 py-3 text-left transition-[background-color] duration-150 ease-out press hover:bg-brand-subtle-10 pressed:bg-brand-subtle-20 pressed:duration-0"
			data-tid={testId}
			{onclick}
			type="button"
		>
			<span class="flex shrink-0" aria-hidden="true">{@render icon()}</span>
			<span class="flex min-w-0 flex-auto flex-col">
				<!-- Wraps rather than truncates: "Another token on Internet Computer" takes two lines at
				375 px. -->
				<span class="text-base font-bold text-primary">{title}</span>
				<span class="truncate pt-0.5 text-sm text-tertiary">{detail}</span>
			</span>
			<span class="flex shrink-0 text-tertiary" aria-hidden="true">
				<IconChevronRight size="20" />
			</span>
		</button>
	</li>
{/snippet}

{#snippet sameNetworkIcon()}
	<NetworkLogo color="white" network={sourceToken.network} size="md" />
{/snippet}

{#snippet otherNetworkIcon()}
	{#if nonNullish(otherNetwork?.group.icon)}
		<Logo color="white" size="md" src={otherNetwork.group.icon} />
	{:else}
		<TokenLogo color="white" data={sourceToken} logoSize="md" />
	{/if}
{/snippet}

{#snippet anyTokenIcon()}
	<span class="flex size-[42px] items-center justify-center rounded-full bg-tertiary text-primary">
		<IconSearch />
	</span>
{/snippet}

{#if visible}
	<div
		class="rounded-lg border border-solid border-tertiary bg-secondary p-5 text-left"
		data-tid={SWAP_RECEIVE_SHORTCUTS}
	>
		<div class="mb-2 text-sm font-bold">{$i18n.tokens.text.destination_token_title}</div>

		<ul class="flex flex-col gap-2">
			{#if nonNullish(sameNetwork)}
				{@render row({
					testId: SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
					title: replacePlaceholders($i18n.swap.text.receive_shortcut_same_network, {
						$network: sameNetwork.network.name
					}),
					detail: sameNetworkDetail,
					icon: sameNetworkIcon,
					onclick: onSameNetwork
				})}
			{/if}

			{#if nonNullish(otherNetwork)}
				{@render row({
					testId: SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK,
					title: replacePlaceholders($i18n.swap.text.receive_shortcut_other_network, {
						$symbol: otherNetwork.group.symbol
					}),
					detail: otherNetworkDetail,
					icon: otherNetworkIcon,
					onclick: onOtherNetwork
				})}
			{/if}

			{#if nonNullish(anyToken)}
				{@render row({
					testId: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
					title: $i18n.swap.text.receive_shortcut_any_token,
					detail: anyTokenDetail,
					icon: anyTokenIcon,
					onclick: onAnyToken
				})}
			{/if}
		</ul>

		{#if nonNullish($keptDestinationToken)}
			<div class="mt-3 flex justify-center">
				<Button link onclick={onKeep} testId={SWAP_RECEIVE_SHORTCUT_KEEP} type="button">
					{replacePlaceholders($i18n.swap.text.keep_destination, {
						$symbol: getTokenDisplaySymbol($keptDestinationToken),
						$network: $keptDestinationToken.network.name
					})}
				</Button>
			</div>
		{/if}
	</div>
{:else}
	{@render emptyField()}
{/if}

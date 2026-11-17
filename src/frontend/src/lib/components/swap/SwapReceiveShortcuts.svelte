<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
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
	import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getSwapProvidersListing } from '$lib/utils/swap-tokens-filter.utils';
	import { getListedReceiveShortcuts, getReceiveShortcutDetails } from '$lib/utils/swap.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		sourceToken: Token;
		navigation: SwapReceiveShortcutsContext;
		// The plain receive field, shown while there is nothing to offer yet, or nothing at all.
		emptyField: Snippet;
		// After a shortcut or Keep sets the receive token, which takes this card's place.
		onDestinationSet: () => void;
	}

	let { sourceToken, navigation, emptyField, onDestinationSet }: Props = $props();

	const { receiveSupportedData, keptDestinationToken, setDestinationToken } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const titleId = $props.id();

	let root = $state<HTMLDivElement | undefined>();

	let listed = $derived(
		getListedReceiveShortcuts({
			sourceToken,
			supportedData: $receiveSupportedData,
			swapNetworks: $crossChainSwapNetworksMainnets,
			chainNetworks: $networks,
			tokens: $allSwapUniverseTokens,
			$balances: $balancesStore,
			$stakeBalances,
			$exchanges,
			$tokensToPin
		})
	);

	let { sameNetwork, otherNetwork, anyToken } = $derived(listed?.shortcuts ?? {});

	let visible = $derived(
		nonNullish(sameNetwork) || nonNullish(otherNetwork) || nonNullish(anyToken)
	);

	// Only a token the list still offers: the providers may have answered again since it was cleared.
	let keptToken = $derived(
		nonNullish($keptDestinationToken)
			? listed?.tokens.find(({ id }) => id === $keptDestinationToken.id)
			: undefined
	);

	let focusWasInside = false;

	// The plain field and the card swap in place when the providers answer: focus on one moves to the
	// other instead of falling out of the modal. Only focus already here moves, so nothing is taken.
	$effect.pre(() => {
		[visible, sameNetwork, otherNetwork, anyToken, keptToken];

		focusWasInside = root?.contains(document.activeElement) ?? false;
	});

	$effect(() => {
		[visible, sameNetwork, otherNetwork, anyToken, keptToken];

		if (focusWasInside && !(root?.contains(document.activeElement) ?? false)) {
			root?.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true });
		}
	});

	// With one token on another network, the row names it, and says what the route does.
	let onlyOtherNetworkToken = $derived(
		otherNetwork?.tokens.length === 1 ? otherNetwork.tokens[0] : undefined
	);

	let otherNetworkProviders = $derived(
		nonNullish(onlyOtherNetworkToken) && nonNullish($swapSupportedTokensStore)
			? getSwapProvidersListing({
					sourceToken,
					destinationToken: onlyOtherNetworkToken,
					providers: $swapSupportedTokensStore.providers
				})
			: []
	);

	let details = $derived(
		nonNullish(listed)
			? getReceiveShortcutDetails({
					shortcuts: listed.shortcuts,
					i18n: $i18n,
					language: $currentLanguage,
					sourceToken,
					otherNetworkProviders
				})
			: {}
	);

	const track = ({
		action,
		destinationToken
	}: {
		action: SwapReceiveShortcutAction;
		destinationToken?: Token;
	}) => trackSwapReceiveShortcut({ action, sourceToken, destinationToken });

	const setDestination = (token: Token) => {
		setDestinationToken(token);

		onDestinationSet();
	};

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

		setDestination(token);
	};

	const onAnyToken = () => {
		track({ action: 'any_token' });

		navigation.showReceiveList(undefined);
	};

	const onKeep = () => {
		if (isNullish(keptToken)) {
			return;
		}

		track({ action: 'keep' });

		setDestination(keptToken);
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
	detail: string | undefined;
	icon: Snippet;
	onclick: () => void;
})}
	<li>
		<!-- Styled as the Smart Swap cell (SwapProviderCell), on the card's own background. -->
		<button
			class="flex w-full items-center gap-3 rounded-lg border border-tertiary bg-primary px-4 py-3 text-left press hover:bg-brand-subtle-10 pressed:bg-brand-subtle-20"
			data-tid={testId}
			{onclick}
			type="button"
		>
			<span class="flex shrink-0" aria-hidden="true">{@render icon()}</span>
			<span class="flex min-w-0 flex-auto flex-col">
				<!-- Both lines wrap rather than truncate: at 375 px "Another token on Internet Computer"
				takes two, and a cut preview would lose its "and N more". `text-pretty` keeps a last
				word from standing alone ("1 / more"). -->
				<span class="text-base font-bold text-pretty text-primary">{title}</span>
				<span class="pt-0.5 text-sm text-pretty text-tertiary">{detail}</span>
			</span>
			<span class="flex shrink-0 text-tertiary" aria-hidden="true">
				<IconChevronRight size="20" />
			</span>
		</button>
	</li>
{/snippet}

{#snippet iconDisc(icon: Snippet)}
	<span
		style={`width: ${logoSizes.sm}; height: ${logoSizes.sm}`}
		class="flex items-center justify-center rounded-full bg-tertiary text-primary"
	>
		{@render icon()}
	</span>
{/snippet}

{#snippet swapIcon()}
	<IconCkConvert size="20" />
{/snippet}

{#snippet searchIcon()}
	<IconSearch />
{/snippet}

<!-- The Swap button's icon, badged with the network as a token logo is, so the row reads as a swap
that stays on that network. -->
{#snippet sameNetworkIcon()}
	<span class="grid">
		<span class="col-start-1 row-start-1">{@render iconDisc(swapIcon)}</span>
		<!-- The 22 px network badge renders at 16.5 px, keeping it legible on the 36 px icon. -->
		<span class="col-start-1 row-start-1 translate-x-2 translate-y-1 scale-75 place-self-end">
			<NetworkLogo color="white" network={sourceToken.network} />
		</span>
	</span>
{/snippet}

{#snippet otherNetworkIcon()}
	{#if nonNullish(onlyOtherNetworkToken)}
		<!-- Match the 16.5 px network badge on the Swap icon above. -->
		<span class="grid">
			<span class="col-start-1 row-start-1">
				<TokenLogo color="white" data={onlyOtherNetworkToken} logoSize="sm" />
			</span>
			<span class="col-start-1 row-start-1 translate-x-2 translate-y-1 scale-75 place-self-end">
				<NetworkLogo color="white" network={onlyOtherNetworkToken.network} />
			</span>
		</span>
	{:else if nonNullish(otherNetwork?.group.icon)}
		<Logo color="white" size="sm" src={otherNetwork.group.icon} />
	{:else}
		<TokenLogo color="white" data={sourceToken} logoSize="sm" />
	{/if}
{/snippet}

{#snippet anyTokenIcon()}
	{@render iconDisc(searchIcon)}
{/snippet}

<div bind:this={root}>
	{#if visible}
		<div
			class="rounded-lg border border-solid border-tertiary bg-secondary p-5 text-left"
			data-tid={SWAP_RECEIVE_SHORTCUTS}
		>
			<div id={titleId} class="mb-2 text-sm font-bold">
				{$i18n.tokens.text.destination_token_title}
			</div>

			<!-- `role="list"`: Safari drops the semantics of a list without bullets. -->
			<ul class="flex list-none flex-col gap-2" aria-labelledby={titleId} role="list">
				{#if nonNullish(sameNetwork)}
					{@render row({
						testId: SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
						title: replacePlaceholders($i18n.swap.text.receive_shortcut_same_network, {
							$network: sameNetwork.network.name
						}),
						detail: details.sameNetwork,
						icon: sameNetworkIcon,
						onclick: onSameNetwork
					})}
				{/if}

				{#if nonNullish(otherNetwork)}
					{@render row({
						testId: SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK,
						title: nonNullish(onlyOtherNetworkToken)
							? replacePlaceholders($i18n.swap.text.receive_shortcut_token_on_network, {
									$symbol: getTokenDisplaySymbol(onlyOtherNetworkToken),
									$network: onlyOtherNetworkToken.network.name
								})
							: replacePlaceholders($i18n.swap.text.receive_shortcut_other_network, {
									$symbol: otherNetwork.group.symbol
								}),
						detail: details.otherNetwork,
						icon: otherNetworkIcon,
						onclick: onOtherNetwork
					})}
				{/if}

				{#if nonNullish(anyToken)}
					{@render row({
						testId: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
						title: $i18n.swap.text.receive_shortcut_any_token,
						detail: details.anyToken,
						icon: anyTokenIcon,
						onclick: onAnyToken
					})}
				{/if}
			</ul>

			{#if nonNullish(keptToken)}
				<!-- The inner box keeps the link's tap area and focus ring to its text, not the card's width. -->
				<div class="mt-3 flex justify-center">
					<div class="flex">
						<Button
							link
							onclick={onKeep}
							styleClass="relative hit-area hit-area-touch"
							testId={SWAP_RECEIVE_SHORTCUT_KEEP}
							type="button"
						>
							{replacePlaceholders($i18n.swap.text.keep_destination, {
								$symbol: getTokenDisplaySymbol(keptToken),
								$network: keptToken.network.name
							})}
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		{@render emptyField()}
	{/if}
</div>

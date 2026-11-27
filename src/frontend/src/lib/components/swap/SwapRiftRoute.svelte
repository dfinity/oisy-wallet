<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import kbtcLogo from '$lib/assets/kbtc.webp';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { allFungibleTokens } from '$lib/derived/all-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { RiftQuote } from '$lib/types/rift';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isSameRiftAssetId, riftRouteHops, toRiftAssetId } from '$lib/utils/rift.utils';

	interface Props {
		quote: RiftQuote;
	}

	interface RouteAsset {
		symbol: string;
		label: string;
		icon?: string;
	}

	const { quote }: Props = $props();
	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// Route intermediates need not be wallet tokens. Ink's kBTC appears in Rift's BTC → USDC quote.
	// Contract: https://support.kraken.com/articles/what-is-kbtc
	// Logo: https://docs.chain.link/ccip/directory/mainnet/token/kBTC
	const INK_KBTC = 'evm:57073.0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98';

	const venueNames = new Map([
		['rift_otc', 'Rift OTC'],
		['velora', 'Velora'],
		['relay', 'Relay'],
		['lifi', 'LI.FI'],
		['chainflip', 'Chainflip'],
		['near_intents', 'NEAR Intents'],
		['hyperliquid', 'Hyperliquid'],
		['unit', 'Unit']
	]);

	const tokens = $derived(
		[$sourceToken, $destinationToken, ...$allFungibleTokens].filter(nonNullish)
	);

	const assetLabel = ({ symbol, network }: { symbol: string; network: string }) =>
		replacePlaceholders($i18n.swap.text.rift_route_asset, { $token: symbol, $network: network });

	const resolveAsset = (id: string): RouteAsset => {
		const token = tokens.find((token) => toRiftAssetId(token) === id.toLowerCase());

		if (nonNullish(token)) {
			const { symbol, icon, network } = token;
			return { symbol, icon, label: assetLabel({ symbol, network: network.name }) };
		}

		if (isSameRiftAssetId({ a: id, b: INK_KBTC })) {
			return {
				symbol: 'kBTC',
				icon: kbtcLogo,
				label: assetLabel({ symbol: 'kBTC', network: 'Ink' })
			};
		}

		return { symbol: shortenWithMiddleEllipsis({ text: id, splitLength: 4 }), label: id };
	};

	const steps = $derived(riftRouteHops(quote));
	const hops = $derived(
		steps.map(({ from, to, venue }) => ({
			from: resolveAsset(from),
			to: resolveAsset(to),
			venue: venueNames.get(venue) ?? venue
		}))
	);
	const firstHop = $derived(hops[0]);
	const chainsInOneTrack = $derived(
		steps.length <= 4 &&
			steps.every(({ from }, index) => {
				const previous = steps[index - 1];
				return isNullish(previous) || isSameRiftAssetId({ a: from, b: previous.to });
			})
	);

	// Token symbols never shrink, so a track wider than the card would clip them: the route then
	// shows one hop per row. The track is as wide as its content up to the card, and never narrower
	// than its narrowest layout, so being wider than the card means it doesn't fit. The last width is
	// kept while stacked: it depends on the route, not on the card, so a wider card can bring the
	// track back. A width of 0 means not measured yet.
	let availableWidth = $state(0);
	let oneTrackWidth = $state(0);
	const fitsInOneTrack = $derived(
		chainsInOneTrack && (availableWidth === 0 || oneTrackWidth <= availableWidth)
	);

	const hopCount = $derived(
		hops.length === 1
			? $i18n.swap.text.rift_route_one_hop
			: replacePlaceholders($i18n.swap.text.rift_route_hops, { $count: `${hops.length}` })
	);
</script>

{#snippet token({ symbol, label, icon }: RouteAsset, column: number)}
	<span style:grid-column={column} class="route-token row-start-1 inline-flex min-w-0 items-center">
		{#if nonNullish(icon)}
			<Img rounded src={icon} styleClass="route-token-icon shrink-0" />
		{/if}
		<span class="truncate font-semibold" title={label}>{symbol}</span>
	</span>
{/snippet}

{#snippet connector(venue: string, column: number)}
	<span
		style:grid-column={column}
		class="route-arrow row-start-1 justify-self-center rtl:-scale-x-100"
	>
		<IconArrowRight />
	</span>
	<span
		style:grid-column={column}
		class="route-venue row-start-2 text-center text-xs text-secondary">{venue}</span
	>
{/snippet}

{#snippet oneTrack(first: RouteAsset)}
	{@render token(first, 1)}
	{#each hops as { to, venue }, index (index)}
		{@render connector(venue, index * 2 + 2)}
		{@render token(to, index * 2 + 3)}
	{/each}
{/snippet}

{#if nonNullish(firstHop)}
	<details class="swap-route mb-1 text-tertiary" open>
		<summary
			class="hit-area relative flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded-sm row-feedback text-sm hit-area-touch"
		>
			<span>{$i18n.swap.text.swap_route}</span>
			<span class="flex shrink-0 items-center gap-1.5">
				<span class="route-count text-xs">{hopCount}</span>
				<span class="route-chevron" aria-hidden="true"><IconExpandMore size={16} /></span>
			</span>
		</summary>

		<ol class="sr-only" role="list">
			{#each hops as { from, to, venue }, index (index)}
				<li>
					{replacePlaceholders($i18n.swap.text.rift_route_hop, {
						$from: from.label,
						$to: to.label,
						$venue: venue
					})}
				</li>
			{/each}
		</ol>

		<div class="grid gap-2 pb-1" aria-hidden="true" bind:clientWidth={availableWidth}>
			{#if fitsInOneTrack}
				<div
					style:--hops={hops.length}
					class="route-track one-track"
					class:dense={hops.length > 2}
					bind:clientWidth={oneTrackWidth}
				>
					{@render oneTrack(firstHop.from)}
				</div>
			{:else}
				{#each hops as { from, to, venue }, index (index)}
					<div style:--hops={1} class="route-track stacked">
						{@render token(from, 1)}
						{@render connector(venue, 2)}
						{@render token(to, 3)}
					</div>
				{/each}
			{/if}
		</div>
	</details>
{/if}

<style lang="scss">
	summary::-webkit-details-marker {
		display: none;
	}

	details[open] .route-count {
		display: none;
	}

	details[open] .route-chevron {
		rotate: 180deg;
	}

	.route-track {
		--icon-size: 0.875rem;
		--arrow-size: 0.75rem;
		// Room for a venue name under its arrow; the name may spill under the tokens beside it.
		--arrow-column: 2.5rem;
		display: grid;
		grid-template-columns:
			repeat(var(--hops), max-content minmax(var(--arrow-column), 3.875rem))
			max-content;
		grid-template-rows: minmax(1.125rem, auto) auto;
		align-items: center;
		row-gap: 0.0625rem;
	}

	.route-track.dense {
		--icon-size: 0.75rem;
		--arrow-size: 0.625rem;
		--arrow-column: 2rem;
	}

	.one-track {
		width: fit-content;
	}

	.route-token {
		column-gap: 0.25rem;
		color: var(--color-foreground-primary);
		font-size: 0.8125rem;
		line-height: 1rem;
	}

	.dense .route-token {
		column-gap: 0.125rem;
		font-size: 0.75rem;
	}

	.route-token :global(.route-token-icon),
	.route-arrow :global(svg) {
		display: block;
		width: var(--icon-size);
		height: var(--icon-size);
	}

	.route-arrow :global(svg) {
		width: var(--arrow-size);
		height: var(--arrow-size);
	}

	.route-venue {
		max-width: 3.25rem;
		justify-self: center;
		align-self: start;
		overflow-wrap: anywhere;
		text-wrap: balance;
	}

	.stacked .route-venue {
		width: 100%;
	}
</style>

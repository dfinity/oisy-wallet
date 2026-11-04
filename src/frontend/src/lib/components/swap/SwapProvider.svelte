<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { readable } from 'svelte/store';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import SwapProviderAnimation from '$lib/components/swap/SwapProviderAnimation.svelte';
	import SwapProviderDetails from '$lib/components/swap/SwapProviderDetails.svelte';
	import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { SWAP_PROVIDER_CELL, SWAP_PROVIDER_STATUS } from '$lib/constants/test-ids.constants';
	import {
		MOTION_ENTER,
		MOTION_REDUCED_FADE_DURATION,
		MOTION_SWAP_DURATION
	} from '$lib/constants/transition.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { swapProviderPool } from '$lib/providers/swap-provider-pool.providers';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { calculateSwapGainUsd, findSwapProvider } from '$lib/utils/swap.utils';
	import { fade, fly, slide } from '$lib/utils/transitions.utils';

	interface Props {
		slippageValue: OptionAmount;
		isForm?: boolean;
		showSelectButton?: boolean;
		onShowProviderList?: () => void;
	}

	// Below one cent the gain line would read "+$0.00"; the offer count says more.
	const MIN_DISPLAYED_GAIN_USD = 0.01;

	const { store: swapAmountsStore, activity } =
		getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);
	const quoteActivity = activity ?? readable(undefined);
	const swapContext = getContext<SwapContext | undefined>(SWAP_CONTEXT_KEY);
	const sourceToken = swapContext?.sourceToken ?? readable(undefined);
	const destinationToken = swapContext?.destinationToken ?? readable(undefined);
	const destinationTokenExchangeRate =
		swapContext?.destinationTokenExchangeRate ?? readable(undefined);

	let {
		showSelectButton = false,
		slippageValue,
		onShowProviderList,
		isForm = false
	}: Props = $props();
	let comparing = $derived(
		isForm && $quoteActivity?.pending === true && !$quoteActivity.background
	);

	let providerPool = $derived(
		isForm && nonNullish($sourceToken) && nonNullish($destinationToken)
			? swapProviderPool({
					sourceNetworkId: $sourceToken.network.id,
					destinationNetworkId: $destinationToken.network.id
				})
			: undefined
	);

	// The cell re-lays out one swap duration after `comparing` changes: the outgoing labels (the
	// result line and Best Rate, or the status) fade out in place first, then the incoming ones fade
	// in, so two sets never share the cell and nothing beside them shifts mid-fade.
	let comparingLayout = $state(untrack(() => comparing));
	$effect(() => {
		const next = comparing;
		if (next === untrack(() => comparingLayout)) {
			return;
		}
		// With no offer there is no result line to fade out first, so the status arrives with the
		// cell instead of one swap duration after it.
		if (next && untrack(() => ($swapAmountsStore?.swaps.length ?? 0) === 0)) {
			comparingLayout = next;
			return;
		}
		const timer = setTimeout(
			() => (comparingLayout = next),
			prefersReducedMotion.current ? MOTION_REDUCED_FADE_DURATION : MOTION_SWAP_DURATION
		);
		return () => clearTimeout(timer);
	});
	const labelIn = { duration: MOTION_SWAP_DURATION, easing: MOTION_ENTER.easing };

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);
	let confirmedRequestId = $state<number>();
	// Completion snapshots survive form/review navigation. Keep the observed foreground round
	// eligible through pending → ready, before the completion effect consumes its observation.
	let observedRequestId = $state<number>();
	let confirmationId = $derived(
		nonNullish($quoteActivity) &&
			(confirmedRequestId === $quoteActivity.requestId ||
				observedRequestId === $quoteActivity.requestId) &&
			!$quoteActivity.pending &&
			!$quoteActivity.background &&
			nonNullish(selectedProvider) &&
			!$swapAmountsStore?.manuallySelectedProviderKey
			? $quoteActivity.requestId
			: undefined
	);
	let animate = $derived(comparing || nonNullish(confirmationId));

	$effect(() => {
		const current = $quoteActivity;
		if (!selectedProvider || !current) {
			confirmedRequestId = undefined;
		}
		if (!isForm || !current || current.background) {
			observedRequestId = undefined;
			return;
		}
		if (current.pending) {
			observedRequestId = current.requestId;
			return;
		}
		if (observedRequestId === current.requestId) {
			observedRequestId = undefined;
			if (selectedProvider && !$swapAmountsStore?.manuallySelectedProviderKey) {
				confirmedRequestId = current.requestId;
			}
		}
	});
	let offerCount = $derived($swapAmountsStore?.swaps.length ?? 0);
	let isBestRate = $derived(selectedProvider?.provider === $swapAmountsStore?.swaps[0]?.provider);
	let swapDApp = $derived(
		nonNullish(selectedProvider?.provider) ? findSwapProvider(selectedProvider.provider) : null
	);

	let gainUsd = $derived(
		nonNullish(selectedProvider) && nonNullish($swapAmountsStore) && nonNullish($destinationToken)
			? calculateSwapGainUsd({
					swaps: $swapAmountsStore.swaps,
					selectedProvider,
					decimals: $destinationToken.decimals,
					exchangeRate: $destinationTokenExchangeRate
				})
			: undefined
	);
	let gainAmount = $derived(
		nonNullish(gainUsd) && gainUsd >= MIN_DISPLAYED_GAIN_USD
			? formatCurrency({
					value: gainUsd,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);
	// One sentence for translators, split around the amount only to set it in the primary colour:
	// green would fall below 4.5:1 on white at this size, and "+" already says it is a gain. A
	// manual pick that is not the best is still worth more than the lowest offer, but showing that
	// as a gain would present a worse choice as a win, so it gets the offer count instead.
	let gainParts = $derived.by(() => {
		if (isNullish(gainAmount) || !isBestRate) {
			return;
		}
		const [before, after = ''] = $i18n.swap.text.smart_swap_gain.split('$amount');
		return { before, amount: `+${gainAmount}`, after };
	});
	let offersLabel = $derived(
		replacePlaceholders(
			isBestRate
				? $i18n.swap.text.smart_swap_best_of_offers
				: $i18n.swap.text.smart_swap_offers_compared,
			{ $count: `${offerCount}` }
		)
	);

	// A single offer is one row: the provider alone says there was nothing to compare, so neither
	// the line under the title nor the Best Rate slot is kept. Later rounds for the same pair keep
	// that row instead of growing and shrinking it on every amount; the provider scroll already
	// shows that it is loading. A new pair starts with the status under the title again.
	let settled = $derived(!comparing && !comparingLayout && offerCount > 0);
	let singleOfferPair = $state.raw<[TokenId | undefined, TokenId | undefined]>();
	$effect(() => {
		if (settled) {
			singleOfferPair =
				offerCount === 1
					? [untrack(() => $sourceToken?.id), untrack(() => $destinationToken?.id)]
					: undefined;
		}
	});
	let compact = $derived(
		settled
			? offerCount === 1
			: nonNullish(singleOfferPair) &&
					singleOfferPair[0] === $sourceToken?.id &&
					singleOfferPair[1] === $destinationToken?.id
	);

	// The cell opens the offers and the selected provider's details once there is something to
	// show; while a round compares it stays put, as the details would describe a stale offer.
	let interactive = $derived(
		showSelectButton && nonNullish(onShowProviderList) && !comparing && offerCount > 0
	);

	// One region for screen readers, mounted before any round and outside the cell, a button whose
	// children are presentational. Only its text changes, so each change is heard: the status while
	// comparing, then the provider the comparison picked.
	let announcement = $derived(
		comparing
			? $i18n.swap.text.finding_best_rate
			: nonNullish(swapDApp)
				? resolveText({ i18n: $i18n, path: swapDApp.name })
				: ''
	);
</script>

{#if isForm}
	<span class="sr-only" aria-live="polite" data-tid={SWAP_PROVIDER_STATUS} role="status"
		>{announcement}</span
	>
{/if}

{#if comparing || (nonNullish(swapDApp) && nonNullish(selectedProvider) && nonNullish($swapAmountsStore))}
	<!-- The row opens and closes with its height, so what is below moves instead of jumping. The
	gap to the next row is padding inside it, not the parent's flex gap, for the same reason. -->
	<div class:pb-3={isForm} transition:slide>
		<div transition:fly={{ y: 4 }}>
			{#if isForm}
				<!-- A grey card like the amount cards (`TokenInput`: fill, faintest border, radius), on the
				content edges like the message boxes and the fee row, so the form stays light. It takes the rows'
				blue on hover and press, only while it can be tapped. -->
				<button
					class="relative mb-3 flex w-full items-center gap-3 rounded-lg border border-tertiary bg-secondary px-4 py-3 text-left press disabled:cursor-default"
					class:hover:bg-brand-subtle-10={interactive}
					class:pressed:bg-brand-subtle-20={interactive}
					data-tid={SWAP_PROVIDER_CELL}
					disabled={!interactive}
					onclick={() => onShowProviderList?.()}
					type="button"
				>
					<span class="smart-beam" class:beaming={comparing} aria-hidden="true"><span></span></span>
					<!-- Typography of the app's list rows (`LogoButton`, as in the offers list): title and
					provider `text-lg font-bold`, the lines under them `text-sm text-tertiary`. The title
					sets the column's minimum width; the line under it truncates first. A single offer
					drops the line with its height (see `compact`), so the gap above it is its padding. -->
					<span class="flex flex-auto flex-col">
						<span class="text-lg font-bold whitespace-nowrap text-primary"
							>{$i18n.swap.text.smart_swap}</span
						>
						{#if !compact}
							<span class="flex w-0 min-w-full pt-0.5 text-sm whitespace-nowrap" transition:slide>
								{#if comparingLayout}
									<!-- While a foreground round compares, a light band runs through the status, the
									way a thinking line does; it never gets lighter than the tertiary text. -->
									<span
										class="truncate text-tertiary transition-opacity duration-150 ease-in motion-reduce:duration-100"
										class:opacity-0={!comparing}
										class:smart-thinking={comparing}
										aria-hidden="true"
										in:fade={labelIn}>{$i18n.swap.text.finding_best_rate}</span
									>
								{:else}
									<span
										class="truncate transition-opacity duration-150 ease-in motion-reduce:duration-100"
										class:opacity-0={comparing}
										in:fade={labelIn}
									>
										{#if nonNullish(gainParts)}
											<span class="text-tertiary"
												>{gainParts.before}<span class="font-semibold text-primary"
													>{gainParts.amount}</span
												>{gainParts.after}</span
											>
										{:else}
											<span class="text-tertiary">{offersLabel}</span>
										{/if}
									</span>
								{/if}
							</span>
						{/if}
					</span>
					<!-- While comparing, the scroll keeps room for a logo and a short name down to 320 px.
					Below 390 px it is also capped there, so a long name truncates instead of
					shortening the status on its turn. -->
					<span
						class="flex flex-initial flex-col items-end"
						class:max-[24.375rem]:max-w-24={comparingLayout}
						class:min-w-0={!comparingLayout}
						class:min-w-24={comparingLayout}
					>
						<!-- No Best Rate badge on the form: the line under the title already says the pick
						beat the other quotes, and by how much. -->
						<SwapProviderAnimation
							{animate}
							{confirmationId}
							loading={comparing}
							pool={providerPool}
							providers={$quoteActivity?.providers ?? []}
							selectedProvider={selectedProvider?.provider}
						/>
					</span>
					<span
						class="flex shrink-0 text-tertiary transition-opacity duration-150"
						class:opacity-40={!interactive}
						aria-hidden="true"
					>
						<IconChevronRight size="20" />
					</span>
				</button>
				<!-- The form's one separator, between the cell and the fee row: the cell sits with the
				amounts it prices, the fees below it. It leaves with the cell, so a form with no offer
				has none. -->
				<Hr />
			{:else if nonNullish(swapDApp) && nonNullish(selectedProvider) && nonNullish($swapAmountsStore)}
				<CollapsibleBottomSheet showContentHeader>
					{#snippet contentHeader({ isInBottomSheet })}
						<ModalValue>
							{#snippet label()}
								<div class="flex justify-center gap-2">
									{$i18n.swap.text.swap_provider}
									{#if offerCount > 1 && !isInBottomSheet && showSelectButton}
										<Button link onclick={onShowProviderList}>{$i18n.swap.text.select}</Button>
									{/if}
								</div>
							{/snippet}

							{#snippet mainValue()}
								<div class="flex items-start gap-3">
									{#if isBestRate && offerCount > 0}
										<BestRateBadge />
									{/if}
									<div class="flex gap-2">
										<div class="mt-1">
											<Logo
												alt={replacePlaceholders($i18n.dapps.alt.logo, {
													$dAppName: resolveText({ i18n: $i18n, path: swapDApp.name })
												})}
												src={swapDApp.logo}
											/>
										</div>
										<div class="mr-auto">
											<div class="text-lg font-bold"
												>{resolveText({ i18n: $i18n, path: swapDApp.name })}</div
											>
										</div>
									</div>
								</div>
							{/snippet}
						</ModalValue>
					{/snippet}
					{#snippet content()}
						<SwapProviderDetails provider={selectedProvider} {slippageValue} />
					{/snippet}
					{#snippet contentFooter(closeFn)}
						<Button fullWidth onclick={closeFn}>Done</Button>
					{/snippet}
				</CollapsibleBottomSheet>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.smart-thinking {
		background: linear-gradient(
				90deg,
				var(--color-foreground-tertiary) 0 35%,
				var(--color-foreground-primary) 50%,
				var(--color-foreground-tertiary) 65% 100%
			)
			0 0 / 300% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;

		@media (prefers-reduced-motion: no-preference) {
			animation: smart-thinking 1600ms linear infinite;
		}

		@media (prefers-reduced-motion: reduce) {
			background: none;
			color: var(--color-foreground-tertiary);
		}
	}

	@keyframes smart-thinking {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: 0% 0;
		}
	}

	// While a foreground round compares, a beam of logo blue with a long, lighter tail travels round
	// the card's border, a lap every 3.6 s, over its 1 px grey border. Calm on purpose: it fades in
	// after 120 ms (a quick round never flashes it) over 500 ms, and out over 600 ms; between rounds
	// the beam holds still where it is and the next round carries on from there, so it never jumps
	// back to the start. It turns by `rotate` on an oversized square behind a ring-shaped mask, which
	// the compositor can animate. Under reduced motion the ring is a still, faint blue.
	.smart-beam {
		position: absolute;
		inset: -1.5px;
		padding: 1.5px;
		overflow: hidden;
		border-radius: inherit;
		pointer-events: none;
		opacity: 0;
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		transition: opacity 600ms cubic-bezier(0.23, 1, 0.32, 1);

		span {
			position: absolute;
			top: 50%;
			left: 50%;
			width: 200%;
			aspect-ratio: 1;
			translate: -50% -50%;
			background: conic-gradient(
				transparent 0 45%,
				color-mix(in srgb, var(--color-foreground-brand-primary-alt) 30%, transparent) 72%,
				var(--color-foreground-brand-primary) 92%,
				transparent 100%
			);
			animation: smart-beam 3600ms linear infinite paused;
		}

		&.beaming {
			opacity: 1;
			transition-duration: 500ms;
			transition-delay: 120ms;

			span {
				animation-play-state: running;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			span {
				animation: none;
				background: var(--color-border-brand-subtle-20);
			}
		}
	}

	@keyframes smart-beam {
		to {
			rotate: 1turn;
		}
	}
</style>

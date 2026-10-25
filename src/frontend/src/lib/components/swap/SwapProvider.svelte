<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { readable } from 'svelte/store';
	import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
	import { oisyTradeSwapEnabled } from '$env/oisy-trade-swap';
	import { KONGSWAP_PROVIDER_ENABLED } from '$env/rest/kongswap.env';
	import { LIFI_SWAP_ENABLED } from '$env/rest/lifi.env';
	import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
	import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
	import SwapDetailsChainFusion from '$lib/components/swap/SwapDetailsChainFusion.svelte';
	import SwapDetailsIcp from '$lib/components/swap/SwapDetailsIcp.svelte';
	import SwapDetailsKong from '$lib/components/swap/SwapDetailsKongSwap.svelte';
	import SwapDetailsLifi from '$lib/components/swap/SwapDetailsLifi.svelte';
	import SwapDetailsNearIntents from '$lib/components/swap/SwapDetailsNearIntents.svelte';
	import SwapDetailsOisyTrade from '$lib/components/swap/SwapDetailsOisyTrade.svelte';
	import SwapDetailsOneSec from '$lib/components/swap/SwapDetailsOneSec.svelte';
	import SwapDetailsVelora from '$lib/components/swap/SwapDetailsVelora.svelte';
	import SwapProviderAnimation from '$lib/components/swap/SwapProviderAnimation.svelte';
	import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import {
		MOTION_ENTER,
		MOTION_REDUCED_FADE_DURATION,
		MOTION_SWAP_DURATION
	} from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { OptionString } from '$lib/types/string';
	import { SwapProvider } from '$lib/types/swap';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { swapProviderPool } from '$lib/utils/swap-provider-pool.utils';
	import { findSwapProvider } from '$lib/utils/swap.utils';
	import { fade, fly, slide } from '$lib/utils/transitions.utils';
	import { UrlSchema } from '$lib/validation/url.validation';

	interface Props {
		slippageValue: OptionAmount;
		isForm?: boolean;
		showSelectButton?: boolean;
		onShowProviderList?: () => void;
	}

	const { store: swapAmountsStore, activity } =
		getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);
	const quoteActivity = activity ?? readable(undefined);
	const swapContext = getContext<SwapContext | undefined>(SWAP_CONTEXT_KEY);
	const sourceToken = swapContext?.sourceToken ?? readable(undefined);
	const destinationToken = swapContext?.destinationToken ?? readable(undefined);

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

	// The header re-lays out one swap duration after `comparing` changes: the outgoing labels
	// (Select, Best Rate, or the status) fade out in place first, then the incoming ones fade in,
	// so two sets never share the row and nothing beside them shifts mid-fade.
	let comparingLayout = $state(untrack(() => comparing));
	$effect(() => {
		const next = comparing;
		if (next === untrack(() => comparingLayout)) {
			return;
		}
		// Select and Best Rate need 2+ offers; without them nothing has to fade out first, so the
		// status arrives with the row instead of one swap duration after it.
		if (next && untrack(() => ($swapAmountsStore?.swaps.length ?? 0) <= 1)) {
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

	let displayURL = $state<OptionString>(null);

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
	let isBestRate = $derived(selectedProvider?.provider === $swapAmountsStore?.swaps[0]?.provider);
	let swapDApp = $derived(
		nonNullish(selectedProvider?.provider) ? findSwapProvider(selectedProvider.provider) : null
	);

	$effect(() => {
		if (nonNullish(swapDApp)) {
			const parsed = UrlSchema.safeParse(swapDApp.website);
			if (parsed.success) {
				const url = new URL(parsed.data);
				displayURL = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
				return;
			}
			displayURL = null;
		}
	});
</script>

{#if comparing || (nonNullish(swapDApp) && nonNullish(selectedProvider) && nonNullish($swapAmountsStore))}
	<!-- The row opens and closes with its height, so what is below moves instead of jumping. The
	gap to the next row is padding inside it, not the parent's flex gap, for the same reason. -->
	<div class:pb-3={isForm} transition:slide>
		<div transition:fly={{ y: 4 }}>
			<CollapsibleBottomSheet disabled={comparing} showContentHeader>
				{#snippet contentHeader({ isInBottomSheet })}
					{#if isForm}
						<div class="flex w-full min-w-0 items-center justify-between gap-2">
							<div
								class="flex min-w-min flex-auto flex-nowrap items-center gap-2 text-sm whitespace-nowrap text-tertiary"
							>
								<span class="shrink-0">{$i18n.swap.text.smart_swap}</span>
								{#if comparingLayout}
									<!-- Zero basis keeps the status out of the group's min-content: it truncates
							into whatever the provider scroll leaves, instead of squeezing the scroll. -->
									<span
										class="w-0 flex-1 truncate transition-opacity duration-150 ease-in motion-reduce:duration-100"
										class:opacity-0={!comparing}
										role="status"
										in:fade={labelIn}>{$i18n.swap.text.finding_best_rate}</span
									>
								{:else if ($swapAmountsStore?.swaps.length ?? 0) > 1 && !isInBottomSheet && showSelectButton}
									<span
										class="flex flex-none transition-opacity duration-150 ease-in motion-reduce:duration-100"
										class:opacity-0={comparing}
										inert={comparing}
										in:fade={labelIn}
									>
										<Button
											link
											onclick={(event) => {
												event.stopPropagation();
												onShowProviderList?.();
											}}
											styleClass="flex-none"
											type="button">{$i18n.swap.text.select}</Button
										>
									</span>
								{/if}
							</div>
							<!-- While comparing, the scroll keeps room for a logo and a short name down to 320 px.
					Below 390 px it is also capped there, so a long name truncates instead of
					shortening the status on its turn. -->
							<div
								class="ml-auto flex items-center justify-end gap-2 text-sm text-primary"
								class:max-[24.375rem]:max-w-24={comparingLayout}
								class:min-w-0={!comparingLayout}
								class:min-w-24={comparingLayout}
							>
								{#if !comparingLayout && isBestRate && ($swapAmountsStore?.swaps.length ?? 0) > 1}
									<span
										class="flex transition-opacity duration-150 ease-in motion-reduce:duration-100"
										class:opacity-0={comparing}
										in:fade={labelIn}
									>
										<BestRateBadge styleClass="mt-0" />
									</span>
								{/if}
								<SwapProviderAnimation
									animate={!isInBottomSheet && animate}
									confirmationId={isInBottomSheet ? undefined : confirmationId}
									loading={comparing}
									pool={providerPool}
									providers={$quoteActivity?.providers ?? []}
									selectedProvider={selectedProvider?.provider}
								/>
							</div>
						</div>
					{:else if nonNullish(swapDApp) && nonNullish($swapAmountsStore)}
						<ModalValue>
							{#snippet label()}
								<div class="flex justify-center gap-2">
									{$i18n.swap.text.swap_provider}
									{#if nonNullish($swapAmountsStore) && $swapAmountsStore?.swaps.length > 1 && !isInBottomSheet && showSelectButton}
										<Button link onclick={onShowProviderList}>{$i18n.swap.text.select}</Button>
									{/if}
								</div>
							{/snippet}

							{#snippet mainValue()}
								<div class="flex items-start gap-3">
									{#if isBestRate && $swapAmountsStore.swaps.length > 1}
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
					{/if}
				{/snippet}
				{#snippet content()}
					{#if !comparing && nonNullish(selectedProvider)}
						{#if displayURL}
							<ModalValue>
								{#snippet label()}
									{$i18n.swap.text.swap_provider_website}
								{/snippet}

								{#snippet mainValue()}
									<div class="text-sm">{displayURL}</div>
								{/snippet}
							</ModalValue>
						{/if}
						{#if selectedProvider.provider === SwapProvider.KONG_SWAP && KONGSWAP_PROVIDER_ENABLED}
							<SwapDetailsKong provider={selectedProvider} />
						{:else if selectedProvider.provider === SwapProvider.ICP_SWAP}
							<SwapDetailsIcp provider={selectedProvider} {slippageValue} />
						{:else if selectedProvider.provider === SwapProvider.VELORA}
							<SwapDetailsVelora provider={selectedProvider} />
						{:else if selectedProvider.provider === SwapProvider.NEAR_INTENTS && NEAR_INTENTS_SWAP_ENABLED}
							<SwapDetailsNearIntents provider={selectedProvider} {slippageValue} />
						{:else if selectedProvider.provider === SwapProvider.ONE_SEC && ONESEC_SWAP_ENABLED}
							<SwapDetailsOneSec provider={selectedProvider} />
						{:else if selectedProvider.provider === SwapProvider.CHAIN_FUSION && CHAIN_FUSION_SWAP_ENABLED}
							<SwapDetailsChainFusion provider={selectedProvider} />
						{:else if selectedProvider.provider === SwapProvider.OISY_TRADE && oisyTradeSwapEnabled}
							<SwapDetailsOisyTrade provider={selectedProvider} />
						{:else if selectedProvider.provider === SwapProvider.LIFI && LIFI_SWAP_ENABLED}
							<SwapDetailsLifi provider={selectedProvider} />
						{/if}
					{/if}
				{/snippet}
				{#snippet contentFooter(closeFn)}
					<Button fullWidth onclick={closeFn}>Done</Button>
				{/snippet}
			</CollapsibleBottomSheet>
		</div>
	</div>
{/if}

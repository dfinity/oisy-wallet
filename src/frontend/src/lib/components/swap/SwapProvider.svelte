<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapBestRateBadge from './SwapBestRateBadge.svelte';
	import SwapDetailsIcp from '$lib/components/swap/SwapDetailsIcp.svelte';
	import SwapDetailsKong from '$lib/components/swap/SwapDetailsKongSwap.svelte';
	import SwapDetailsVelora from '$lib/components/swap/SwapDetailsVelora.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { OptionString } from '$lib/types/string';
	import { SwapProvider } from '$lib/types/swap';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { findSwapProvider } from '$lib/utils/swap.utils';
	import { UrlSchema } from '$lib/validation/url.validation';

	interface Props {
		slippageValue: OptionAmount;
		showSelectButton?: boolean;
	}

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let { showSelectButton = false, slippageValue }: Props = $props();

	let displayURL = $state<OptionString>(null);

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);
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

	const dispatch = createEventDispatcher();
</script>

{#if nonNullish(swapDApp) && nonNullish(selectedProvider) && nonNullish($swapAmountsStore)}
	<CollapsibleBottomSheet showContentHeader>
		{#snippet contentHeader({ isInBottomSheet })}
			<ModalValue>
				{#snippet label()}
					<div class="flex justify-center gap-2">
						{$i18n.swap.text.swap_provider}
						{#if nonNullish($swapAmountsStore) && $swapAmountsStore?.swaps.length > 1 && !isInBottomSheet && showSelectButton}
							<Button link onclick={() => dispatch('icShowProviderList')}
								>{$i18n.swap.text.select}</Button
							>
						{/if}
					</div>
				{/snippet}

				{#snippet mainValue()}
					<div class="flex items-start gap-3">
						{#if isBestRate && $swapAmountsStore.swaps.length > 1}
							<SwapBestRateBadge />
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
			{#if selectedProvider.provider === SwapProvider.KONG_SWAP}
				<SwapDetailsKong provider={selectedProvider} />
			{:else if selectedProvider.provider === SwapProvider.ICP_SWAP}
				<SwapDetailsIcp provider={selectedProvider} {slippageValue} />
			{:else if selectedProvider.provider === SwapProvider.VELORA}
				<SwapDetailsVelora provider={selectedProvider} />
			{/if}
		{/snippet}
		{#snippet contentFooter(closeFn)}
			<Button fullWidth onclick={closeFn}>Done</Button>
		{/snippet}
	</CollapsibleBottomSheet>
{/if}

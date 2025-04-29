<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import Button from '../ui/Button.svelte';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import SwapLiquidityFees from '$lib/components/swap/SwapLiquidityFees.svelte';
	import SwapNetworkFee from '$lib/components/swap/SwapNetworkFee.svelte';
	import SwapRoute from '$lib/components/swap/SwapRoute.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { activeSwap, bestSwapProvider } from '$lib/derived/swap.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionString } from '$lib/types/string';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { UrlSchema } from '$lib/validation/url.validation';
	import { safeParse } from '$lib/validation/utils.validation';
	import Badge from '$lib/components/ui/Badge.svelte';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	$: selectedSwap = $swapAmountsStore?.swaps?.find(
		({ provider }) => provider === $swapAmountsStore?.selectedProvider
	);

	$: route = selectedSwap?.route;
	$: liquidityFees = selectedSwap?.liquidityFees ?? [];
	$: networkFee = selectedSwap?.networkFee ?? undefined;

	$: dApp = nonNullish($activeSwap)
		? dAppDescriptions.find(({ id }) => id === $activeSwap.provider.toLowerCase())
		: undefined;

	$: bestRate = $bestSwapProvider === $activeSwap?.provider;

	// TODO: this state - websiteURL - isn't one and should become a local variable
	let websiteURL: Option<URL>;
	let displayURL: OptionString;
	$: if (nonNullish(dApp)) {
		try {
			const validatedWebsiteUrl = safeParse({
				schema: UrlSchema,
				value: dApp?.website
			});
			if (nonNullish(validatedWebsiteUrl)) {
				websiteURL = new URL(validatedWebsiteUrl);
				displayURL = websiteURL.hostname.startsWith('www.')
					? websiteURL.hostname.substring(4)
					: websiteURL.hostname;
			}
		} catch (_err: unknown) {
			websiteURL = null;
			displayURL = null;
		}
	}

	const dispatch = createEventDispatcher();

	$: console.log('selectedSwap', selectedSwap);
	$: console.log('swapAmountsStore', $swapAmountsStore);
	
</script>

{#if nonNullish(dApp)}
	<ModalExpandableValues>
		<ModalValue slot="list-header">
			<svelte:fragment slot="label"
				>{$i18n.swap.text.swap_provider}

				{#if nonNullish($swapAmountsStore) && $swapAmountsStore?.swaps.length > 1}
					<Button link on:click={() => dispatch('icShowProviderList')}>Select ></Button>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="main-value">
				<div class="flex items-start gap-3">
					{#if bestRate}
						<Badge styleClass="mt-1" variant="success">Best rate</Badge>
					{/if}

					<div class="flex items-start gap-2">
						<div class="mt-0.5">
							<Logo
								src={dApp.logo}
								alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dApp.name })}
							/>
						</div>

						<div>
							<div class="flex items-center gap-1 text-lg font-bold">
								{dApp.name}
							</div>

							{#if nonNullish(displayURL)}
								<div class="text-sm text-tertiary">{displayURL}</div>
							{/if}
						</div>
					</div>
				</div>
			</svelte:fragment>
		</ModalValue>

		<svelte:fragment slot="list-items">
			{#if nonNullish(route) && route.length > 0}
				<SwapRoute {route} />
			{/if}
			{#if nonNullish(networkFee)}
				<SwapNetworkFee {networkFee} />
			{/if}
			{#if nonNullish(liquidityFees) && liquidityFees.length > 0}
				<SwapLiquidityFees {liquidityFees} />
			{/if}
		</svelte:fragment>
	</ModalExpandableValues>
{/if}

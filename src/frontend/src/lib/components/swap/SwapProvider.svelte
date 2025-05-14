<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import SwapLiquidityFees from '$lib/components/swap/SwapLiquidityFees.svelte';
	import SwapNetworkFee from '$lib/components/swap/SwapNetworkFee.svelte';
	import SwapRoute from '$lib/components/swap/SwapRoute.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OisyDappDescription } from '$lib/types/dapp-description';
	import type { OptionString } from '$lib/types/string';
	import type { ProviderFee } from '$lib/types/swap';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { UrlSchema } from '$lib/validation/url.validation';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let route = $derived<string[] | undefined>($swapAmountsStore?.swapAmounts?.route);
	let networkFee = $derived<ProviderFee | undefined>($swapAmountsStore?.swapAmounts?.networkFee);
	let liquidityFees = $derived<ProviderFee[] | undefined>(
		$swapAmountsStore?.swapAmounts?.liquidityFees
	);
	let displayURL = $state<OptionString>(null);
	let kongSwapDApp = $derived<OisyDappDescription | undefined>(
		dAppDescriptions.find(({ id }) => id === 'kongswap')
	);

	$effect(() => {
		if (nonNullish(kongSwapDApp)) {
			const parsed = UrlSchema.safeParse(kongSwapDApp.website);
			if (parsed.success) {
				const url = new URL(parsed.data);
				displayURL = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
				return;
			}
		}
	});
</script>

{#if nonNullish(kongSwapDApp)}
	<ModalExpandableValues>
		<ModalValue slot="list-header">
			<svelte:fragment slot="label">{$i18n.swap.text.swap_provider}</svelte:fragment>

			<svelte:fragment slot="main-value">
				<div class="flex gap-2">
					<div class="mt-1">
						<Logo
							src={kongSwapDApp.logo}
							alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: kongSwapDApp.name })}
						/>
					</div>
					<div class="mr-auto">
						<div class="text-lg font-bold">{kongSwapDApp.name}</div>
						{#if nonNullish(displayURL)}
							<div class="text-sm text-tertiary">{displayURL}</div>
						{/if}
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

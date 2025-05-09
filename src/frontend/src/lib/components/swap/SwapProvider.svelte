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
	import { SwapProvider, type ProviderFee } from '$lib/types/swap';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { UrlSchema } from '$lib/validation/url.validation';
	import { safeParse } from '$lib/validation/utils.validation';
	import SwapDetailsKong from './SwapDetailsKong.svelte';
	import SwapDetailsIcp from './SwapDetailsIcp.svelte';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const swapDApp: OisyDappDescription | undefined = dAppDescriptions.find(
		({ id }) => id === $swapAmountsStore?.selectedProvider?.provider.toLowerCase()
	);

	// TODO: this state - websiteURL - isn't one and should become a local variable
	let websiteURL: Option<URL>;
	let displayURL: OptionString;
	$: if (nonNullish(swapDApp)) {
		try {
			const validatedWebsiteUrl = safeParse({
				schema: UrlSchema,
				value: swapDApp?.website
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
</script>

{#if nonNullish(swapDApp)}
	<ModalExpandableValues>
		<ModalValue slot="list-header">
			<svelte:fragment slot="label">{$i18n.swap.text.swap_provider}</svelte:fragment>

			<svelte:fragment slot="main-value">
				<div class="flex gap-2">
					<div class="mt-1">
						<Logo
							src={swapDApp.logo}
							alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: swapDApp.name })}
						/>
					</div>
					<div class="mr-auto">
						<div class="text-lg font-bold">{swapDApp.name}</div>
						{#if nonNullish(displayURL)}
							<div class="text-sm text-tertiary">{displayURL}</div>
						{/if}
					</div>
				</div>
			</svelte:fragment>
		</ModalValue>

		<svelte:fragment slot="list-items">
			{#if $swapAmountsStore?.selectedProvider?.provider === SwapProvider.KONG_SWAP}
				<SwapDetailsKong provider={$swapAmountsStore.selectedProvider} />
			<!-- {:else if $swapAmountsStore?.selectedProvider?.provider === SwapProvider.ICP_SWAP}
				<SwapDetailsIcp provider={$swapAmountsStore.selectedProvider} /> -->
			{/if}
		</svelte:fragment>
	</ModalExpandableValues>
{/if}

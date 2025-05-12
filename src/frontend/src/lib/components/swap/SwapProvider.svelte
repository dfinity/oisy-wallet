<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionString } from '$lib/types/string';
	import { SwapProvider } from '$lib/types/swap';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { UrlSchema } from '$lib/validation/url.validation';
	import { safeParse } from '$lib/validation/utils.validation';
	import SwapDetailsKong from '$lib/components/swap/SwapDetailsKongSwap.svelte';
	import SwapDetailsIcp from '$lib/components/swap/SwapDetailsIcp.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import type { OisyDappDescription } from '$lib/types/dapp-description';
	import Button from '$lib/components/ui/Button.svelte';
	import SwapBestRateBadge from './SwapBestRateBadge.svelte';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let swapDApp: OisyDappDescription | undefined;

	$: swapDApp = dAppDescriptions.find(
		({ id }) => id === $swapAmountsStore?.selectedProvider?.provider.toLowerCase()
	);

	$: provider = $swapAmountsStore?.selectedProvider;

	$: bestRate = provider?.provider === $swapAmountsStore?.swaps[0]?.provider;

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
	const dispatch = createEventDispatcher();
</script>

{#if nonNullish(swapDApp) && nonNullish(provider)}
	<CollapsibleBottomSheet showContentHeader>
		{#snippet contentHeader({ isInBottomSheet })}
			<ModalValue wrapperStyleClass="items-center">
				<svelte:fragment slot="label">
					<div class="flex justify-center gap-2">
						{$i18n.swap.text.swap_provider}
						{#if nonNullish($swapAmountsStore) && $swapAmountsStore?.swaps.length > 1 && !isInBottomSheet}
							<Button link on:click={() => dispatch('icShowProviderList')}>Select ></Button>
						{/if}
					</div>
				</svelte:fragment>

				<svelte:fragment slot="main-value">
					<div class="flex items-start gap-3">
						{#if bestRate}
							<SwapBestRateBadge />
						{/if}
						<div class="flex gap-2">
							<div class="mt-1">
								<Logo
									src={swapDApp.logo}
									alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: swapDApp.name })}
								/>
							</div>
							<div class="mr-auto">
								<div class="text-lg font-bold">{swapDApp.name}</div>
							</div>
						</div>
					</div>
				</svelte:fragment>
			</ModalValue>
		{/snippet}
		{#snippet content()}
			{#if displayURL}
				<ModalValue>
					<svelte:fragment slot="label">Website</svelte:fragment>

					<svelte:fragment slot="main-value">
						<div class="text-sm">{displayURL}</div>
					</svelte:fragment>
				</ModalValue>
			{/if}
			{#if provider.provider === SwapProvider.KONG_SWAP}
				<SwapDetailsKong {provider} />
			{:else if provider.provider === SwapProvider.ICP_SWAP}
				<SwapDetailsIcp {provider} />
			{/if}
		{/snippet}
		{#snippet contentFooter(closeFn)}
			<Button fullWidth on:click={closeFn}>Done</Button>
		{/snippet}
	</CollapsibleBottomSheet>
{/if}

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
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
	import SwapDetailsKong from './SwapDetailsKong.svelte';
	import SwapDetailsIcp from './SwapDetailsIcp.svelte';
	import CollapsibleBottomSheet from '../ui/CollapsibleBottomSheet.svelte';
	import type { OisyDappDescription } from '$lib/types/dapp-description';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let swapDApp: OisyDappDescription | undefined;

	$: swapDApp = dAppDescriptions.find(
		({ id }) => id === $swapAmountsStore?.selectedProvider?.provider.toLowerCase()
	);

	$: provider = $swapAmountsStore?.selectedProvider;

	console.log(swapDApp, $swapAmountsStore?.selectedProvider?.provider.toLowerCase());

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

{#if nonNullish(swapDApp) && nonNullish(provider)}
	<CollapsibleBottomSheet>
		{#snippet contentHeader()}
			<ModalValue label={$i18n.swap.text.swap_provider}>
				<div class="flex gap-2">
					<div class="mt-1">
						<Logo
							src={swapDApp.logo}
							alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: swapDApp.name })}
						/>
					</div>
					<div class="mr-auto">
						<div class="text-lg font-bold">{swapDApp.name}</div>
						{#if displayURL}
							<div class="text-sm text-tertiary">{displayURL}</div>
						{/if}
					</div>
				</div>
			</ModalValue>
		{/snippet}

		{#snippet content()}
			{#if provider.provider === SwapProvider.KONG_SWAP}
				<SwapDetailsKong {provider} />
			{:else if provider.provider === SwapProvider.ICP_SWAP}
				<SwapDetailsIcp {provider} />
			{/if}
		{/snippet}
	</CollapsibleBottomSheet>
{/if}

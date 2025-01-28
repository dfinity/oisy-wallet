<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SwapValue from '$lib/components/swap/SwapValue.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { dAppDescriptions, type OisyDappDescription } from '$lib/types/dapp-description';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { UrlSchema } from '$lib/validation/url.validation';
	import { safeParse } from '$lib/validation/utils.validation';
	import type { OptionString } from '$lib/types/string';

	let kongSwapDApp: OisyDappDescription | undefined;
	$: kongSwapDApp = dAppDescriptions.find(({id}) => id === 'kongswap');

	let websiteURL: Option<URL>;
	let displayURL: OptionString;
	$: {
		if (nonNullish(kongSwapDApp)) {
			try {
				websiteURL = new URL(
					safeParse({
						schema: UrlSchema,
						value: kongSwapDApp?.website
					})
				);
				displayURL = websiteURL.hostname.startsWith('www.')
					? websiteURL.hostname.substring(4)
					: websiteURL.hostname;
			} catch (e: unknown) {
				websiteURL = null;
				displayURL = null;
			}
		}
	}
</script>

{#if nonNullish(kongSwapDApp)}
	<SwapValue>
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
					{#if nonNullish(websiteURL) && nonNullish(displayURL)}
						<div class="text-sm text-misty-rose">{displayURL}</div>
					{/if}
				</div>
			</div>
		</svelte:fragment>
	</SwapValue>
{/if}

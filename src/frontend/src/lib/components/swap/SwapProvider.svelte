<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SwapValue from '$lib/components/swap/SwapValue.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { dAppDescriptions } from '$lib/types/dapp-description';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let kongSwapDApp;
	$: kongSwapDApp = dAppDescriptions.find((d) => d.id === 'kongswap');

	let websiteURL: Option<URL>;
	let displayURL: Option<string>;
	$: {
		try {
			websiteURL = new URL(kongSwapDApp.website);
			displayURL = websiteURL.hostname.startsWith('www.')
				? websiteURL.hostname.substring(4)
				: websiteURL.hostname;
		} catch (e) {
			websiteURL = null;
			displayURL = null;
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

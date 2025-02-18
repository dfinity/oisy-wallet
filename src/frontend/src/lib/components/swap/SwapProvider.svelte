<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { type OisyDappDescription } from '$lib/types/dapp-description';
	import type { OptionString } from '$lib/types/string';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { UrlSchema } from '$lib/validation/url.validation';
	import { safeParse } from '$lib/validation/utils.validation';

	let kongSwapDApp: OisyDappDescription | undefined;
	$: kongSwapDApp = dAppDescriptions.find(({ id }) => id === 'kongswap');

	// TODO: this state - websiteURL - isn't one and should become a local variable
	let websiteURL: Option<URL>;
	let displayURL: OptionString;
	$: {
		if (nonNullish(kongSwapDApp)) {
			try {
				const validatedWebsiteUrl = safeParse({
					schema: UrlSchema,
					value: kongSwapDApp?.website
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
	}
</script>

{#if nonNullish(kongSwapDApp)}
	<ModalValue>
		<svelte:fragment slot="label">{$i18n.swap.text.swap_provider}</svelte:fragment>

		<svelte:fragment slot="main-value">
			<div class="gap-2 flex">
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
{/if}

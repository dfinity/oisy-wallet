<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Amount from '../ui/Amount.svelte';
	import Logo from '../ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { safeParse } from '$lib/validation/utils.validation';
	import { UrlSchema } from '@dfinity/zod-schemas';
	import Badge from '$lib/components/ui/Badge.svelte';

	export let amount: bigint;
	export let token: any;
	export let logoSize: LogoSize = 'md';
	export let usdBalance: OptionAmount;
	export let dapp: any;
	export let isBest: any;

	let websiteURL: any;
	let displayURL: any;
	$: if (nonNullish(dapp)) {
		try {
			const validatedWebsiteUrl = safeParse({
				schema: UrlSchema,
				value: dapp?.website
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

<LogoButton on:click dividers={true} dotDividers={false}>
	<svelte:fragment slot="title">
		{dapp.name}
	</svelte:fragment>

	<svelte:fragment slot="subtitle">
		{#if isBest}
			<span class="inline-flex"> <Badge variant="success">Best rate</Badge> </span>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="description">
		{#if nonNullish(displayURL)}
			<span class="text-sm text-tertiary">{displayURL}</span>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="logo">
		<Logo
			src={dapp.logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dapp.name })}
			size={logoSize}
		/>
	</svelte:fragment>

	<Amount {amount} decimals={token.decimals} symbol={token.symbol} slot="title-end" />

	<output class="break-all" slot="description-end">
		{usdBalance}
	</output>
</LogoButton>

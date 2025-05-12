<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { safeParse } from '$lib/validation/utils.validation';
	import { UrlSchema } from '@dfinity/zod-schemas';
	import type { LogoSize } from '$lib/types/components';
	import type { OptionAmount } from '$lib/types/send';
	import LogoButton from '../ui/LogoButton.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import SwapBestRateBadge from './SwapBestRateBadge.svelte';
	import Amount from '../ui/Amount.svelte';
	import Logo from '../ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const {
		amount,
		token,
		logoSize = 'md',
		usdBalance,
		dapp,
		isBest
	} = $props<{
		amount: bigint;
		token: any;
		logoSize?: LogoSize;
		usdBalance: OptionAmount;
		dapp: any;
		isBest: boolean;
	}>();

	let websiteURL: URL | null = $state(null);
	let displayURL: string | null = $state(null);

	$effect(() => {
		if (!nonNullish(dapp)) {
			websiteURL = null;
			displayURL = null;
			return;
		}

		try {
			const validated = safeParse({
				schema: UrlSchema,
				value: dapp.website
			});
			if (nonNullish(validated)) {
				const url = new URL(validated);
				websiteURL = url;
				displayURL = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
			}
		} catch {
			websiteURL = null;
			displayURL = null;
		}
	});
</script>

<LogoButton on:click dividers>
	<span slot="title">{dapp.name}</span>

	<span slot="description">
		{#if $displayURL}
			<span class="text-sm text-tertiary">{$displayURL}</span>
		{/if}
	</span>

	<Logo
		slot="logo"
		src={dapp.logo}
		alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dapp.name })}
		size={logoSize}
	/>

	<Amount {amount} decimals={token.decimals} symbol={token.symbol} slot="title-end" />

	<output class="break-all" slot="description-end">
		{#if isBest}
			<SwapBestRateBadge />
		{/if}
		{usdBalance}
	</output>
</LogoButton>

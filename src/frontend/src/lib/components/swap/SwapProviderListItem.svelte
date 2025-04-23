<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import TokenExchangeBalance from '../tokens/TokenExchangeBalance.svelte';
	import Amount from '../ui/Amount.svelte';
	import Logo from '../ui/Logo.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { LogoSize } from '$lib/types/components';
	import type { OptionAmount } from '$lib/types/send';
	import type { CardData } from '$lib/types/token-card';
	import { formatUSD } from '$lib/utils/format.utils';
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

	console.log(amount, token, logoSize, usdBalance, dapp, isBest);
</script>

<LogoButton on:click dividers={true}>
	<svelte:fragment slot="title">
		<span class="inline-flex items-center gap-2">
			<span class="font-bold text-primary">
				{dapp.name}
			</span>
		</span>
	</svelte:fragment>

	<svelte:fragment slot="subtitle">
		{#if isBest}
				<Badge variant="success">Best rate</Badge>
			{/if}
	</svelte:fragment>

    <svelte:fragment slot="description">
		{#if nonNullish(displayURL)}
			<div class="text-sm text-tertiary">{displayURL}</div>
		{/if}
	</svelte:fragment>

	<div class="mr-2" slot="logo">
		<Logo
			src={dapp.logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dapp.name })}
			size={logoSize}
		/>
	</div>

	<Amount {amount} decimals={token.decimals} symbol={token.symbol} slot="title-end" />

	<output class="break-all" slot="description-end">
		{usdBalance}
	</output>
</LogoButton>

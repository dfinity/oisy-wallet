<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { UrlSchema } from '@dfinity/zod-schemas';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import SwapBestRateBadge from '$lib/components/swap/SwapBestRateBadge.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { OisyDappDescription } from '$lib/types/dapp-description';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		amount: bigint;
		destinationToken: IcTokenToggleable;
		logoSize?: LogoSize;
		usdBalance: OptionAmount;
		dapp?: OisyDappDescription;
		isBestRate: boolean;
	}

	const {
		amount,
		destinationToken,
		logoSize = 'md',
		usdBalance,
		dapp,
		isBestRate
	}: Props = $props();

	let displayURL: string | null = $state(null);

	$effect(() => {
		if (nonNullish(dapp)) {
			const parsed = UrlSchema.safeParse(dapp.website);

			if (parsed.success) {
				const url = new URL(parsed.data);
				displayURL = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
				return;
			}

			displayURL = null;
		}
	});
	// TODO: Migrate to Svelte 5, remove legacy slot usage and use render composition instead
</script>

{#if nonNullish(dapp)}
	<LogoButton on:click dividers>
		<span slot="title">{dapp.name}</span>

		<span slot="description">
			{#if nonNullish(displayURL)}
				{displayURL}
			{/if}
		</span>

		<Logo
			slot="logo"
			src={dapp.logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dapp.name })}
			size={logoSize}
		/>

		<Amount
			{amount}
			decimals={destinationToken.decimals}
			symbol={destinationToken.symbol}
			slot="title-end"
		/>

		<div class="flex items-center justify-end gap-2" slot="description-end">
			{#if isBestRate}
				<SwapBestRateBadge />
			{/if}
			<span class="mt-1">
				{usdBalance ?? $i18n.tokens.text.exchange_is_not_available_short}
			</span>
		</div>
	</LogoButton>
{/if}

<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
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
	import { safeParse } from '$lib/validation/utils.validation';

	interface Props {
		amount: bigint;
		token: IcTokenToggleable;
		logoSize?: LogoSize;
		usdBalance: OptionAmount;
		dapp?: OisyDappDescription;
		isBest: boolean;
	}

	const { amount, token, logoSize = 'md', usdBalance, dapp, isBest }: Props = $props();

	let displayURL: string | null = $state(null);

	$effect(() => {
		if (isNullish(dapp)) {
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
				displayURL = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
			}
		} catch {
			displayURL = null;
		}
	});
</script>

// TODO: Migrate to Svelte 5, remove legacy slot usage and use render composition instead
<LogoButton on:click dividers>
	<span slot="title">{dapp.name}</span>

	<span slot="description">
		{#if nonNullish(displayURL)}
			<span class="text-sm text-tertiary">{displayURL}</span>
		{/if}
	</span>

	<Logo
		slot="logo"
		src={dapp.logo}
		alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dapp.name })}
		size={logoSize}
	/>

	<Amount {amount} decimals={token.decimals} symbol={token.symbol} slot="title-end" />

	<div class="flex items-center justify-end gap-2" slot="description-end">
		{#if isBest}
			<SwapBestRateBadge />
		{/if}
		<span class="mt-1">
			{usdBalance}
		</span>
	</div>
</LogoButton>

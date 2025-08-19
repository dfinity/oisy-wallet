<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { UrlSchema } from '@dfinity/zod-schemas';
	import { createEventDispatcher } from 'svelte';
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
	import { resolveText } from '$lib/utils/i18n.utils.js';

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

	const dispatch = createEventDispatcher();
</script>

{#if nonNullish(dapp)}
	<LogoButton dividers onClick={() => dispatch('click')}>
		{#snippet title()}
			{resolveText({ i18n: $i18n, path: dapp.name })}
		{/snippet}

		{#snippet description()}
			{#if nonNullish(displayURL)}
				{displayURL}
			{/if}
		{/snippet}

		{#snippet logo()}
			<Logo
				alt={replacePlaceholders($i18n.dapps.alt.logo, {
					$dAppName: resolveText({ i18n: $i18n, path: dapp.name })
				})}
				size={logoSize}
				src={dapp.logo}
			/>
		{/snippet}

		{#snippet titleEnd()}
			<Amount {amount} decimals={destinationToken.decimals} symbol={destinationToken.symbol} />
		{/snippet}

		{#snippet descriptionEnd()}
			<div class="flex items-center justify-end gap-2">
				{#if isBestRate}
					<SwapBestRateBadge />
				{/if}
				<span class="mt-1">
					{usdBalance ?? $i18n.tokens.text.exchange_is_not_available_short}
				</span>
			</div>
		{/snippet}
	</LogoButton>
{/if}

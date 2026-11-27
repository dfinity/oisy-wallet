<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { UrlSchema } from '@dfinity/zod-schemas';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import Amount from '$lib/components/ui/Amount.svelte';
	import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { OisyDappDescription } from '$lib/types/dapp-description';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapProvidersConfig } from '$lib/types/swap';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';

	interface Props {
		amount: bigint;
		destinationToken: IcTokenToggleable;
		logoSize?: LogoSize;
		usdBalance: OptionAmount;
		dapp?: OisyDappDescription | SwapProvidersConfig;
		isBestRate: boolean;
		isUnprotected?: boolean;
		onClick: () => void;
	}

	const {
		amount,
		destinationToken,
		logoSize = 'md',
		usdBalance,
		dapp,
		isBestRate,
		isUnprotected = false,
		onClick
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
</script>

{#if nonNullish(dapp)}
	<LogoButton dividers {onClick}>
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
			<!-- The provider name truncates instead: the mark and the fiat value are what tell offers
			apart, so neither wraps nor shrinks. -->
			<div class="flex items-center justify-end gap-2 whitespace-nowrap">
				<!-- An unprotected offer holds the Best Rate slot in the fiat value's grey, as the word
				"Estimate", not a badge: it is the row's only mark, so it stays spelled out on phones,
				where the badge is a star. -->
				{#if isUnprotected}
					<span class="mt-1 shrink-0">{$i18n.swap.text.estimate}</span>
				{:else if isBestRate}
					<BestRateBadge />
				{/if}
				<span class="mt-1 shrink-0">
					{usdBalance ?? $i18n.tokens.text.exchange_is_not_available_short}
				</span>
			</div>
		{/snippet}
	</LogoButton>
{/if}

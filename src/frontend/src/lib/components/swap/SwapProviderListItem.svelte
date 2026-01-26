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
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';

	interface Props {
		amount: bigint;
		destinationToken: IcTokenToggleable;
		logoSize?: LogoSize;
		usdBalance: OptionAmount;
		dapp?: OisyDappDescription;
		isBestRate: boolean;
		onClick: () => void;
	}

	const {
		amount,
		destinationToken,
		logoSize = 'md',
		usdBalance,
		dapp,
		isBestRate,
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
			<div class="flex items-center justify-end gap-2">
				{#if isBestRate}
					<BestRateBadge />
				{/if}
				<span class="mt-1">
					{usdBalance ?? $i18n.tokens.text.exchange_is_not_available_short}
				</span>
			</div>
		{/snippet}
	</LogoButton>
{/if}

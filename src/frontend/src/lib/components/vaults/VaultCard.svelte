<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenExchangeValueSkeleton from '$lib/components/tokens/TokenExchangeValueSkeleton.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Vault } from '$lib/types/vaults';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { getTokenDisplayName } from '$lib/utils/token.utils';

	interface Props {
		data: Vault;
		onClick?: () => void;
	}

	let { data, onClick }: Props = $props();

	let { token, apy } = $derived(data);

	let name = $derived(getTokenDisplayName(token));

	let exchange = $derived($exchanges?.[token.id]);

	let assetsPerShare = $derived(
		nonNullish(exchange) && 'assets_per_share' in exchange ? exchange.assets_per_share : undefined
	);

	let underlyingAssets = $derived(
		nonNullish(token.balance) && nonNullish(assetsPerShare)
			? BigInt(Math.round(Number(token.balance) * assetsPerShare))
			: ZERO
	);

	let isHarvestAutopilot = $derived(isTokenHarvestAutopilot(token));

	let currentlyEarning = $derived(
		nonNullish(token?.usdBalance) && nonNullish(apy) ? (token.usdBalance * Number(apy)) / 100 : 0
	);
</script>

<div class="flex w-full flex-col">
	<LogoButton {onClick}>
		{#snippet logo()}
			<span class="mr-2 flex">
				<TokenLogo
					badge={{ type: 'network' }}
					color="white"
					data={{ ...token, icon: token.assetIcon ?? token.icon }}
					logoSize={isMobile() ? 'sm' : 'lg'}
				/>
			</span>
		{/snippet}

		{#snippet title()}
			<span class="text-sm sm:text-lg">{name}</span>
		{/snippet}

		{#snippet subtitle()}
			{#if isHarvestAutopilot}
				<span class="hidden sm:inline-block">
					<Badge styleClass="ml-2 mb-1" variant="transparent" width="w-fit">
						{$i18n.vaults.text.autopilot}
					</Badge>
				</span>
			{/if}
		{/snippet}

		{#snippet description()}
			{#if nonNullish(apy)}
				<Badge variant={Number(apy) > 0 ? 'success' : 'default'} width="w-fit">
					{`${$i18n.vaults.text.live_apy} ${apy}%`}
				</Badge>
			{/if}
		{/snippet}

		{#snippet titleEnd()}
			<span
				class="flex min-w-12 items-center justify-end gap-1 text-sm text-nowrap sm:gap-2 sm:text-base"
			>
				{#if (token?.usdBalance ?? 0) > 0}
					<EarningYearlyAmount
						showAsSuccess
						showPlusSign
						showWithShortenedLabel
						value={currentlyEarning}
					/>
				{/if}

				<ExchangeTokenValue data={token} />
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<TokenExchangeValueSkeleton data={token}>
				<span class="block min-w-12 text-nowrap">
					{formatToken({ value: underlyingAssets, unitName: token.decimals })}
					{token.assetSymbol}
				</span>
			</TokenExchangeValueSkeleton>
		{/snippet}
	</LogoButton>
</div>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { HARVEST_AUTOPILOT_URL } from '$eth/constants/harvest-autopilots.constants';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Vault } from '$lib/types/vaults';
	import { formatCurrency, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		vault: Vault;
	}

	let { vault }: Props = $props();

	let { token } = $derived(vault);

	let href = $derived(
		`${HARVEST_AUTOPILOT_URL}${token.network.name.toLowerCase()}/${token.address}`
	);
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="flex w-full items-center gap-3 border-b border-secondary pb-4">
			<h4 class="flex flex-1">{$i18n.stake.text.vault_info}</h4>

			<ExternalLink
				ariaLabel={$i18n.stake.text.vault_info}
				{href}
				iconAsLast
				iconSize="15"
				styleClass="text-sm"
			>
				{$i18n.core.text.info}
			</ExternalLink>
		</div>
	{/snippet}

	{#snippet content()}
		<p class="mb mt-4 text-sm text-secondary">
			{replacePlaceholders($i18n.stake.text.vault_description, {
				$asset_symbol: vault.token.assetSymbol
			})}
		</p>

		<List>
			<ListItem>
				<span class="text-sm text-secondary">
					{$i18n.networks.network}
				</span>

				<span class="text-sm font-semibold">
					<NetworkWithLogo logo="start" network={token.network} />
				</span>
			</ListItem>

			<ListItem>
				<span class="text-sm text-secondary">
					{$i18n.core.text.asset}
				</span>

				<span class="flex items-center gap-2 text-sm font-semibold">
					<TokenLogo
						color="white"
						data={{ ...token, icon: token.assetIcon ?? token.icon }}
						logoSize="xxs"
					/>

					{token.assetSymbol}
				</span>
			</ListItem>

			<ListItem>
				<span class="text-sm text-secondary">
					{$i18n.stake.text.vault_address}
				</span>

				<span class="text-sm font-semibold">
					<output>{shortenWithMiddleEllipsis({ text: token.address })}</output>

					<AddressActions
						copyAddress={token.address}
						copyAddressText={replacePlaceholders($i18n.transaction.text.hash_copied, {
							$hash: token.address
						})}
						externalLink={href}
						externalLinkAriaLabel={$i18n.stake.text.vault_info}
					/>
				</span>
			</ListItem>

			<ListItem>
				<span class="text-sm text-secondary">
					{$i18n.stake.text.protocol}
				</span>

				<span class="text-sm font-semibold">
					{$i18n.stake.text.autopilot}
				</span>
			</ListItem>

			{#if nonNullish(vault.totalValueLocked)}
				<ListItem>
					<span class="text-sm text-secondary">
						{$i18n.stake.text.total_value_locked}
					</span>

					<span class="text-sm font-semibold">
						{formatCurrency({
							value: Number(vault.totalValueLocked),
							currency: $currentCurrency,
							exchangeRate: $currencyExchangeStore,
							language: $currentLanguage
						})}
					</span>
				</ListItem>
			{/if}
		</List>
	{/snippet}
</StakeContentSection>

<script lang="ts">
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		HELP_EXPLORERS_CARD,
		HELP_EXPLORERS_GROUP,
		HELP_EXPLORERS_LINK
	} from '$lib/constants/test-ids.constants';
	import { btcAddressMainnet, ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_HELP
	} from '$lib/enums/plausible';
	import { buildHelpEvent } from '$lib/services/help-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { HelpExplorerChain } from '$lib/types/help';
	import { SwapProvider } from '$lib/types/swap';
	import {
		buildHelpExplorerGroups,
		HELP_EXPLORER_PROVIDER_NAMES
	} from '$lib/utils/help-explorers.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	// Mainnet addresses only: the links point at the providers' production explorers, where
	// a testnet or local address has nothing to show.
	const groups = $derived(
		buildHelpExplorerGroups({
			ethAddress: $ethAddress,
			solAddress: $solAddressMainnet,
			btcAddress: $btcAddressMainnet,
			principal: $authIdentity?.getPrincipal().toText()
		})
	);

	const providerName = (provider: SwapProvider): string =>
		HELP_EXPLORER_PROVIDER_NAMES[provider] ?? '';

	const providerDescription = (provider: SwapProvider): string => {
		if (provider === SwapProvider.VELORA) {
			return $i18n.help.text.explorers_velora_description;
		}

		if (provider === SwapProvider.NEAR_INTENTS) {
			return $i18n.help.text.explorers_near_intents_description;
		}

		return $i18n.help.text.explorers_onesec_description;
	};

	const chainLabel = (chain: HelpExplorerChain): string => {
		if (chain === 'sol') {
			return $i18n.help.text.explorers_chain_sol;
		}

		if (chain === 'btc') {
			return $i18n.help.text.explorers_chain_btc;
		}

		if (chain === 'icp') {
			return $i18n.help.text.explorers_chain_icp;
		}

		return $i18n.help.text.explorers_chain_eth;
	};
</script>

{#if groups.length > 0}
	<div data-tid={HELP_EXPLORERS_CARD}>
		<SettingsCard>
			{#snippet title()}{$i18n.help.text.explorers_title}{/snippet}

			<p class="mb-3 text-sm text-tertiary">
				{replaceOisyPlaceholders($i18n.help.text.explorers_description)}
			</p>

			{#each groups as { provider, links }, index (provider)}
				{#if index > 0}
					<Hr spacing="md" />
				{/if}

				<div data-tid={HELP_EXPLORERS_GROUP}>
					<h5 class="text-sm font-bold">{providerName(provider)}</h5>

					<!-- `p` carries a global bottom margin and `ul` a global square marker, so both
					     are reset here rather than inherited into a card that spaces itself. -->
					<p class="mt-1 mb-0 text-sm text-tertiary">{providerDescription(provider)}</p>

					<ul class="mt-2 mb-0 flex list-none flex-col gap-2 p-0">
						{#each links as { chain, url } (chain)}
							<li>
								<ExternalLink
									ariaLabel={replacePlaceholders($i18n.help.alt.explorer_link, {
										$provider: providerName(provider),
										$chain: chainLabel(chain)
									})}
									href={url}
									iconAsLast
									styleClass="font-bold"
									testId={`${HELP_EXPLORERS_LINK}-${provider}-${chain}`}
									trackEvent={buildHelpEvent({
										action: 'explorer',
										resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
										subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.PROVIDER_EXPLORERS,
										provider,
										network: chain
									})}
								>
									{chainLabel(chain)}
								</ExternalLink>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</SettingsCard>
	</div>
{/if}

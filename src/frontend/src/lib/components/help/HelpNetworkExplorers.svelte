<script lang="ts">
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		HELP_NETWORK_EXPLORERS_CARD,
		HELP_NETWORK_EXPLORERS_LINK
	} from '$lib/constants/test-ids.constants';
	import { btcAddressMainnet, ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { networksMainnets } from '$lib/derived/networks.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_HELP
	} from '$lib/enums/plausible';
	import { buildHelpEvent } from '$lib/services/help-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { buildHelpNetworkExplorerLinks } from '$lib/utils/help-explorers.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	// Driven by the networks the user has enabled, so switching one off in Settings removes
	// its link. `icrcAccountIdentifierText` is the ICP address the wallet shows everywhere
	// else, which is the principal for a default subaccount.
	const links = $derived(
		buildHelpNetworkExplorerLinks({
			networks: $networksMainnets,
			ethAddress: $ethAddress,
			solAddress: $solAddressMainnet,
			btcAddress: $btcAddressMainnet,
			principal: $icrcAccountIdentifierText
		})
	);
</script>

{#if links.length > 0}
	<div data-tid={HELP_NETWORK_EXPLORERS_CARD}>
		<SettingsCard>
			{#snippet title()}{$i18n.help.text.network_explorers_title}{/snippet}

			<p class="mb-3 text-sm text-tertiary">
				{replaceOisyPlaceholders($i18n.help.text.network_explorers_description)}
			</p>

			<!-- `ul` carries a global square marker and a browser padding, so both are reset
			     here rather than inherited into a card that spaces itself. -->
			<ul class="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
				{#each links as { network, chain, url } (network.id)}
					<li>
						<ExternalLink
							ariaLabel={replacePlaceholders($i18n.help.alt.network_explorer_link, {
								$network: network.name
							})}
							href={url}
							iconAsLast
							styleClass="font-bold"
							testId={`${HELP_NETWORK_EXPLORERS_LINK}-${chain}`}
							trackEvent={buildHelpEvent({
								action: 'explorer',
								resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
								subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.NETWORK_EXPLORERS,
								network: chain
							})}
						>
							<NetworkWithLogo logo="start" {network} />
						</ExternalLink>
					</li>
				{/each}
			</ul>
		</SettingsCard>
	</div>
{/if}

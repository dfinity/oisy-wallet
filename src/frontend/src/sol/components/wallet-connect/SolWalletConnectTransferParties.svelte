<script lang="ts">
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SolAddress } from '$sol/types/address';
	import type { SolTransferParties, SolTransferParty } from '$sol/types/sol-transaction';
	import {
		isSolTransferSourcesRedundant,
		solTransferPartyAddress
	} from '$sol/utils/sol-transfer-parties.utils';

	interface Props {
		parties: SolTransferParties;
		// The wallet the review already names as its source, which is what makes a Sources list
		// redundant when it resolves to nothing else.
		userAddress: SolAddress;
	}

	let { parties, userAddress }: Props = $props();

	let { sources } = $derived(parties);

	// Every source is one of the user's own accounts by the rule itself, so a list that resolves to
	// the wallet the review already displays only repeats it. Suppressing it is safe only because
	// the review's partial notice says when a list could not be built, which is the other thing an
	// absent section could otherwise mean.
	let showSources = $derived(
		sources.length > 0 && !isSolTransferSourcesRedundant({ sources, userAddress })
	);
</script>

{#snippet partyRow(party: SolTransferParty)}
	{@const displayed = solTransferPartyAddress(party)}

	<div class="flex flex-col gap-1" data-tid="transfer-party">
		<span class="flex flex-wrap items-center gap-2">
			{displayed}

			<!-- A source displayed by an account address rather than by the wallet the review names
			     would otherwise read as a counterparty. Marking it is what says it is still ours. -->
			{#if party.own}
				<span class="text-tertiary" data-tid="transfer-party-own">
					{$i18n.wallet_connect.text.transfer_party_own}
				</span>
			{/if}
		</span>

		<ContactOrToken identifier={displayed} />
	</div>
{/snippet}

{#if showSources}
	<WalletConnectModalValue
		label={$i18n.wallet_connect.text.transfer_sources}
		ref="transfer-sources"
	>
		<div class="flex flex-col gap-3">
			{#each sources as source (source.address)}
				{@render partyRow(source)}
			{/each}
		</div>
	</WalletConnectModalValue>
{/if}

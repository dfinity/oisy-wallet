<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import CyclesTopUpContact from '$icp/components/cycles-top-up/CyclesTopUpContact.svelte';
	import CyclesTopUpRecentCanister from '$icp/components/cycles-top-up/CyclesTopUpRecentCanister.svelte';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import {
		getCanisterNetworkContacts,
		getRecentlyToppedUpCanisters
	} from '$icp/utils/cycles-top-up.utils';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import {
		CYCLES_TOP_UP_CONTACT,
		CYCLES_TOP_UP_ICP_HINT,
		CYCLES_TOP_UP_RECENT_CANISTER
	} from '$lib/constants/test-ids.constants';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { getNetworkContact } from '$lib/utils/contacts.utils';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		// The TCYCLES token, whose loaded history lists the top-ups, whatever pays for this one.
		// Absent while TCYCLES is not enabled, and then nothing is listed.
		token?: IcToken;
		// The history cannot name a canister topped up with ICP, so with ICP picked the list
		// says so, whether or not it has entries.
		paidWithIcp?: boolean;
		onSelect: (canisterId: string) => void;
	}

	let { token, paidWithIcp = false, onSelect }: Props = $props();

	type CanisterTab = 'recentlyToppedUp' | 'contacts';

	let canisters = $derived(
		getRecentlyToppedUpCanisters(
			(nonNullish(token) ? ($icTransactionsStore?.[token.id] ?? []) : []).map(({ data }) => data)
		)
	);

	let canisterContacts = $derived(getCanisterNetworkContacts($contacts));

	// Contacts when there is nothing to pick from the history but a contact to pick: the
	// history cannot name a canister topped up with ICP, so a user who paid that way may have
	// no recent canister at all. Decided when the step opens, so that the tab does not jump
	// once more history loads.
	const openingTab = (): CanisterTab =>
		canisters.length === 0 && Object.keys(canisterContacts).length > 0
			? 'contacts'
			: 'recentlyToppedUp';

	let activeTab = $state<CanisterTab>(openingTab());
</script>

<div class="mt-6">
	<Tabs
		tabs={[
			{ label: $i18n.cycles_top_up.text.recently_topped_up, id: 'recentlyToppedUp' },
			{ label: $i18n.send.text.contacts_tab, id: 'contacts' }
		]}
		bind:activeTab
	>
		{#if activeTab === 'recentlyToppedUp'}
			<div in:fade>
				{#if canisters.length > 0 && nonNullish(token)}
					{#if paidWithIcp}
						<div class="mb-3">
							<MessageBox level="info" testId={CYCLES_TOP_UP_ICP_HINT}>
								<p class="font-bold">{$i18n.cycles_top_up.text.icp_hint_title}</p>
								<p>{$i18n.cycles_top_up.text.icp_hint_description}</p>
							</MessageBox>
						</div>
					{/if}

					<ul class="flex list-none flex-col gap-1">
						{#each canisters as { canisterId, value, timestamp } (canisterId)}
							<li data-tid={CYCLES_TOP_UP_RECENT_CANISTER}>
								<CyclesTopUpRecentCanister
									{canisterId}
									contact={getNetworkContact({
										networkContacts: canisterContacts,
										address: canisterId,
										networkId: ICP_NETWORK_ID
									})}
									{onSelect}
									{timestamp}
									{token}
									{value}
								/>
							</li>
						{/each}
					</ul>
				{:else if paidWithIcp}
					<!-- In place of the usual empty state, which would promise the canister a place here. -->
					<div data-tid={CYCLES_TOP_UP_ICP_HINT}>
						<EmptyState
							description={$i18n.cycles_top_up.text.icp_hint_description}
							title={$i18n.cycles_top_up.text.icp_hint_title}
						/>
					</div>
				{:else}
					<EmptyState
						description={$i18n.cycles_top_up.text.recently_topped_up_empty_state_description}
						title={$i18n.cycles_top_up.text.recently_topped_up_empty_state_title}
					/>
				{/if}
			</div>
		{:else}
			<div in:fade>
				{#if Object.keys(canisterContacts).length > 0}
					<ul class="flex list-none flex-col gap-1">
						{#each Object.entries(canisterContacts) as [key, { address, contact }] (key)}
							<li data-tid={CYCLES_TOP_UP_CONTACT}>
								<CyclesTopUpContact {address} {contact} {onSelect} />
							</li>
						{/each}
					</ul>
				{:else}
					<EmptyState
						description={$i18n.cycles_top_up.text.contacts_empty_state_description}
						title={$i18n.cycles_top_up.text.contacts_empty_state_title}
					/>
				{/if}
			</div>
		{/if}
	</Tabs>
</div>

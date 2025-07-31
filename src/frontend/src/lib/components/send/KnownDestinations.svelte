<script lang="ts">
	import { isEmptyString, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import KnownDestination from '$lib/components/send/KnownDestination.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { areAddressesPartiallyEqual } from '$lib/utils/address.utils';
	import { isContactMatchingFilter } from '$lib/utils/contact.utils';
	import { getNetworkContact } from '$lib/utils/contacts.utils';

	interface Props {
		destination: string;
		knownDestinations?: KnownDestinations;
		networkContacts?: NetworkContacts;
		selectedContact?: ContactUi;
	}
	let {
		knownDestinations,
		destination = $bindable(),
		selectedContact = $bindable(),
		networkContacts
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let sortedKnownDestinations = $derived(
		nonNullish(knownDestinations)
			? Object.values(knownDestinations).sort(
					(destinationA, destinationB) =>
						(destinationB.timestamp ?? 0) - (destinationA.timestamp ?? 0)
				)
			: []
	);

	let filteredKnownDestinations = $derived(
		isEmptyString(destination)
			? sortedKnownDestinations
			: sortedKnownDestinations.filter(({ address }) => {
					const networkContact = nonNullish(networkContacts)
						? getNetworkContact({
								networkContacts,
								address,
								networkId: $sendTokenNetworkId
							})
						: undefined;

					if (nonNullish(networkContact)) {
						return isContactMatchingFilter({
							address,
							contact: networkContact,
							filterValue: destination,
							networkId: $sendTokenNetworkId
						});
					}

					return areAddressesPartiallyEqual({
						address1: address,
						address2: destination,
						networkId: $sendTokenNetworkId
					});
				})
	);
</script>

<div in:fade>
	{#if nonNullish(knownDestinations) && filteredKnownDestinations.length > 0}
		<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]" in:fade>
			<ul class="list-none overflow-y-auto overscroll-contain">
				{#each filteredKnownDestinations as { address, ...rest } (address)}
					{@const networkContact = nonNullish(networkContacts)
						? getNetworkContact({
								networkContacts,
								address,
								networkId: $sendTokenNetworkId
							})
						: undefined}

					<li>
						<KnownDestination
							contact={networkContact}
							destination={address}
							{...rest}
							onClick={() => {
								destination = address;

								if (nonNullish(networkContact)) {
									selectedContact = networkContact;
								}

								dispatch('icNext');
							}}
						/>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<EmptyState
			description={$i18n.send.text.recently_used_empty_state_description}
			title={$i18n.send.text.recently_used_empty_state_title}
		/>
	{/if}
</div>

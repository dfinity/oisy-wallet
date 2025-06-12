<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconPenLine from '$lib/components/icons/IconPenLine.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import { SEND_DESTINATION_SECTION } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { getContactForAddress } from '$lib/utils/contact.utils';
	import { contacts } from '$lib/derived/contacts.derived';

	interface Props {
		destination: string;
		invalidDestination?: boolean;
	}
	let { destination, invalidDestination = false }: Props = $props();

	const dispatch = createEventDispatcher();

	const onIcSendDestinationStep = () => dispatch('icSendDestinationStep');

	let addressToDisplay = $derived(shortenWithMiddleEllipsis({ text: destination }));

	let contact: ContactUi | undefined = $derived(
		nonNullish(destination)
			? getContactForAddress({
					contactList: $contacts,
					addressString: destination
				})
			: undefined
	);
</script>

<div class="mb-10 mt-6" data-tid={SEND_DESTINATION_SECTION}>
	<div class="font-bold">{$i18n.core.text.to}</div>

	<AddressCard hasError={invalidDestination} items="center">
		{#snippet logo()}
			<div class="mr-2">
				<AvatarWithBadge
					{contact}
					address={destination}
					badge={{ type: 'addressType', address: destination }}
				/>
			</div>
		{/snippet}

		{#snippet content()}
			{#if isNullish(contact)}
				{addressToDisplay}
			{:else}
				<SendContactName {contact} address={destination} />

				<span class="text-sm text-tertiary">{addressToDisplay}</span>
			{/if}
		{/snippet}

		{#snippet actions()}
			<button
				class="text-brand-primary"
				onclick={onIcSendDestinationStep}
				aria-label={$i18n.core.text.back}
			>
				<IconPenLine />
			</button>
		{/snippet}
	</AddressCard>
</div>

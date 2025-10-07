<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ContactWithAvatar from '$lib/components/contact/ContactWithAvatar.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';

	interface Props {
		destination: string;
	}

	let { destination }: Props = $props();

	let contact = $derived(
		getContactForAddress({ addressString: destination, contactList: $contacts })
	);

	let contactAddress = $derived(filterAddressFromContact({ contact, address: destination }));
</script>

<WalletConnectModalValue label={$i18n.send.text.destination} ref="destination">
	<div class="flex flex-col gap-1">
		{destination}
		{#if nonNullish(contact)}
			<ContactWithAvatar {contact} {contactAddress} />
		{/if}
	</div>
</WalletConnectModalValue>

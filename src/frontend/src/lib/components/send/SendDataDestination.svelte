<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { isTokenErc } from '$eth/utils/erc.utils';
	import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
	import { isTokenIc } from '$icp/utils/icrc.utils';
	import ContactWithAvatar from '$lib/components/contact/ContactWithAvatar.svelte';
	import TokenAsContact from '$lib/components/tokens/TokenAsContact.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		destination: string;
		label?: string;
	}

	let { destination, label }: Props = $props();

	let putativeToken = $derived(
		$allTokens.find((t) =>
			areAddressesEqual({
				address1: destination,
				address2: isTokenIc(t)
					? t.ledgerCanisterId
					: isTokenErc(t) || isTokenSpl(t)
						? t.address
						: isTokenIcNft(t)
							? t.canisterId
							: undefined,
				networkId: t.network.id
			})
		)
	);

	let contact = $derived(
		getContactForAddress({ addressString: destination, contactList: $allContacts })
	);

	let contactAddress = $derived(filterAddressFromContact({ contact, address: destination }));
</script>

<WalletConnectModalValue label={label ?? $i18n.send.text.destination} ref="destination">
	<div class="flex flex-col gap-1">
		{destination}
		{#if nonNullish(putativeToken)}
			<TokenAsContact token={putativeToken} />
		{:else if nonNullish(contact)}
			<ContactWithAvatar {contact} {contactAddress} />
		{/if}
	</div>
</WalletConnectModalValue>

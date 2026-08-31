<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ContactWithAvatar from '$lib/components/contact/ContactWithAvatar.svelte';
	import TokenAsContact from '$lib/components/tokens/TokenAsContact.svelte';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { findPutativeToken } from '$lib/utils/tokens.utils';

	interface Props {
		identifier: string | undefined;
		showFallback?: boolean;
	}

	let { identifier, showFallback = false }: Props = $props();

	let putativeToken = $derived(findPutativeToken({ tokens: $allTokens, identifier }));

	let contact = $derived(
		nonNullish(identifier)
			? getContactForAddress({ addressString: identifier, contactList: $allContacts })
			: undefined
	);

	let contactAddress = $derived(filterAddressFromContact({ contact, address: identifier }));
</script>

{#if nonNullish(putativeToken)}
	<TokenAsContact token={putativeToken} />
{:else if nonNullish(contact)}
	<ContactWithAvatar {contact} {contactAddress} />
{:else if showFallback && nonNullish(identifier)}
	<span class="flex inline-block max-w-38 min-w-0 flex-wrap items-center truncate">
		{shortenWithMiddleEllipsis({ text: identifier })}
	</span>
{/if}

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ContactWithAvatar from '$lib/components/contact/ContactWithAvatar.svelte';
	import ProgramAsContact from '$lib/components/contact/ProgramAsContact.svelte';
	import TokenAsContact from '$lib/components/tokens/TokenAsContact.svelte';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { allPrograms } from '$lib/derived/programs.derived';
	import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { findPutativeToken } from '$lib/utils/tokens.utils';

	interface Props {
		identifier: string | undefined;
		showFallback?: boolean;
	}

	let { identifier, showFallback = false }: Props = $props();

	let putativeToken = $derived(findPutativeToken({ tokens: $allTokens, identifier }));

	// A program is never a contact and never a token: it is the thing a transaction ran through,
	// and the curated list is the only place its name lives.
	let program = $derived(
		nonNullish(identifier) ? $allPrograms.find(({ address }) => address === identifier) : undefined
	);

	let contact = $derived(
		nonNullish(identifier)
			? getContactForAddress({ addressString: identifier, contactList: $allContacts })
			: undefined
	);

	let contactAddress = $derived(filterAddressFromContact({ contact, address: identifier }));
</script>

{#if nonNullish(putativeToken)}
	<TokenAsContact token={putativeToken} />
{:else if nonNullish(program)}
	<ProgramAsContact {program} />
{:else if nonNullish(contact)}
	<ContactWithAvatar {contact} {contactAddress} />
{:else if showFallback && nonNullish(identifier)}
	<span class="flex inline-block max-w-38 min-w-0 flex-wrap items-center truncate">
		{shortenWithMiddleEllipsis({ text: identifier })}
	</span>
{/if}

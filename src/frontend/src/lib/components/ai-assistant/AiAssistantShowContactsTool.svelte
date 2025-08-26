<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import AiAssistantShowContactsToolItem from '$lib/components/ai-assistant/AiAssistantShowContactsToolItem.svelte';
	import { MAX_DISPLAYED_ADDRESSES_NUMBER } from '$lib/constants/ai-assistant.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ShowContactsToolResult } from '$lib/types/ai-assistant';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props extends ShowContactsToolResult {}

	let { contacts, message }: Props = $props();

	let allAddresses = $derived(
		contacts.reduce<{ contact: ContactUi; address: ContactAddressUi }[]>(
			(acc, contact) => [
				...acc,
				...contact.addresses.map((address) => ({
					contact,
					address
				}))
			],
			[]
		)
	);

	let addressesToDisplay = $derived(allAddresses.slice(0, MAX_DISPLAYED_ADDRESSES_NUMBER));

	let restAddressesNumber = $derived(allAddresses.length - addressesToDisplay.length);
</script>

{#if addressesToDisplay.length > 0}
	<div class="mb-2 text-sm">{$i18n.ai_assistant.text.select_contact_message}</div>

	{#each addressesToDisplay as { contact, address }, index (index)}
		<AiAssistantShowContactsToolItem {address} {contact} />
	{/each}
{:else}
	<span class="text-sm">
		{notEmptyString(message) ? message : $i18n.ai_assistant.text.no_contacts_found_message}
	</span>
{/if}

{#if restAddressesNumber > 0}
	<div class="mt-2 text-center text-sm">
		{replacePlaceholders($i18n.core.text.more_items, { $items: `${restAddressesNumber}` })}
	</div>
{/if}

<script lang="ts">
	import { isEmptyString, notEmptyString } from '@dfinity/utils';
	import AiAssistantShowContactsToolItem from '$lib/components/ai-assistant/AiAssistantShowContactsToolItem.svelte';
	import { MAX_DISPLAYED_ADDRESSES_NUMBER } from '$lib/constants/ai-assistant.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ShowContactsToolResult } from '$lib/types/ai-assistant';
	import type { ContactAddressUiWithId, ExtendedAddressContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props extends ShowContactsToolResult {
		onSendMessage: (params: { messageText: string; context?: string }) => Promise<void>;
	}

	let { contacts, message, onSendMessage }: Props = $props();

	let allAddresses = $derived(
		contacts.reduce<{ contact: ExtendedAddressContactUi; address: ContactAddressUiWithId }[]>(
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
		<AiAssistantShowContactsToolItem
			{address}
			{contact}
			onClick={async () =>
				await onSendMessage({
					messageText: replacePlaceholders($i18n.ai_assistant.text.send_to_message, {
						$contact_name: contact.name,
						$address_info: `${isEmptyString(address.label) ? '' : `${address.label}: `}${shortenWithMiddleEllipsis({ text: address.address })}`
					}),
					context: `Send destination information: contact id - ${contact.id}; address id - ${address.id}; address type: ${address.addressType}.`
				})}
		/>
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

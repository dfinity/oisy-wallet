<script lang="ts">
	import { isEmptyString } from '@dfinity/utils';
	import AiAssistantShowContactsToolItem from '$lib/components/ai-assistant/AiAssistantShowContactsToolItem.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ShowContactsToolResult } from '$lib/types/ai-assistant';
	import type { ContactAddressUiWithId } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props extends ShowContactsToolResult {
		onSendMessage: (params: { messageText?: string; context?: string }) => Promise<void>;
		loading: boolean;
	}

	let { contacts, loading, onSendMessage }: Props = $props();
</script>

{#if contacts.length > 0}
	<div class="mb-2 text-sm">{$i18n.ai_assistant.text.select_contact_message}</div>

	<List noBorder noPadding>
		{#each contacts as contact, index (index)}
			<ListItem styleClass="mb-2 last:mb-0">
				<AiAssistantShowContactsToolItem
					{contact}
					onClick={async (address: ContactAddressUiWithId) =>
						!loading &&
						(await onSendMessage({
							messageText: replacePlaceholders($i18n.ai_assistant.text.send_to_message, {
								$contact_name: contact.name,
								$address_info: `${isEmptyString(address.label) ? '' : `${address.label}: `}${shortenWithMiddleEllipsis({ text: address.address })}`
							}),
							context: `Send destination information: "selectedContactAddressId" - ${address.id}; "addressType": ${address.addressType}.`
						}))}
				/>
			</ListItem>
		{/each}
	</List>
{:else}
	<span class="text-sm">
		{$i18n.ai_assistant.text.no_contacts_found_message}
	</span>
{/if}

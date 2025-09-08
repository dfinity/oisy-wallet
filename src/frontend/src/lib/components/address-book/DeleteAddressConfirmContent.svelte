<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onCancel: () => void;
		onDelete: () => void;
		address: ContactAddressUi;
		contact: ContactUi;
		disabled?: boolean;
	}

	let { onCancel, onDelete, address, contact, disabled = false }: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-center pb-5">
	<span class="mb-5 px-1 text-center sm:px-0">
		<Html
			text={replacePlaceholders($i18n.address.delete.content_text, {
				$address: shortenWithMiddleEllipsis({ text: address.address }),
				$contact: contact.name
			})}
		/>
	</span>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel {disabled} onclick={onCancel}></ButtonCancel>
			<Button colorStyle="error" loading={disabled} onclick={onDelete}>
				{$i18n.address.delete.delete_address}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

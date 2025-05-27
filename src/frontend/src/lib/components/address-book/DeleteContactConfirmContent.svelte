<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onCancel: () => void;
		onDelete: (id: bigint) => void;
		contact: ContactUi;
	}

	let { onCancel, onDelete, contact }: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-center pb-5">
	<span class="mb-5 text-center">
		{replacePlaceholders($i18n.contact.delete.content_text, {
			$contact: contact.name
		})}
	</span>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={onCancel}></ButtonCancel>
		<Button colorStyle="error" on:click={() => onDelete(contact.id)}>
			{$i18n.contact.delete.delete_contact}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>

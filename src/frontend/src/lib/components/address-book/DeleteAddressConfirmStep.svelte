<script lang="ts">
    import ContentWithToolbar from "$lib/components/ui/ContentWithToolbar.svelte";
    import ButtonCancel from "$lib/components/ui/ButtonCancel.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ButtonGroup from "$lib/components/ui/ButtonGroup.svelte";
    import type {ContactAddressUi, ContactUi} from "$lib/types/contact";
    import {replacePlaceholders} from "$lib/utils/i18n.utils";
    import {i18n} from "$lib/stores/i18n.store";
    import {Html} from "@dfinity/gix-components";

    interface Props {
        onCancel: () => void;
        onDelete: () => void;
        address: ContactAddressUi;
        contact: ContactUi;
    }

    let {onCancel, onDelete, address, contact}: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-center pb-5">
    <span class="text-center mb-5">
        <Html text={replacePlaceholders($i18n.address.delete.content_text, {
            $address: address.address,
            $contact: contact.name
        })} />
    </span>

    <ButtonGroup slot="toolbar">
        <ButtonCancel onclick={onCancel}></ButtonCancel>
        <Button colorStyle="error" on:click={onDelete}>
            {$i18n.address.delete.delete_address}
        </Button>
    </ButtonGroup>
</ContentWithToolbar>
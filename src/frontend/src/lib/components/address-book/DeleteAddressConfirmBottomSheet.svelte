<script lang="ts">
    import DeleteAddressConfirmContent from "$lib/components/address-book/DeleteAddressConfirmContent.svelte";
    import {BottomSheet} from "@dfinity/gix-components";
    import IconClose from "$lib/components/icons/lucide/IconClose.svelte";
    import ButtonIcon from "$lib/components/ui/ButtonIcon.svelte";
    import {i18n} from "$lib/stores/i18n.store";
    import type {ContactAddressUi, ContactUi} from "$lib/types/contact";

    interface Props {
        onCancel: () => void;
        onDelete: () => void;
        address: ContactAddressUi;
        contact: ContactUi;
    }

    let {onCancel, onDelete, address, contact}: Props = $props();
</script>

<BottomSheet transition>
    {#snippet header()}
        <div class="w-full p-4">
            <ButtonIcon
                onclick={onCancel}
                styleClass="text-disabled float-right"
                ariaLabel={$i18n.core.alt.close_details}
            >
                {#snippet icon()}
                    <IconClose size="24" />
                {/snippet}
            </ButtonIcon>
        </div>
    {/snippet}

    <h3 class="text-center mt-12 mb-2">{$i18n.address.delete.title}</h3>

    <DeleteAddressConfirmContent
        {onCancel}
        {onDelete}
        {address}
        {contact}
    />
</BottomSheet>
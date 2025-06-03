<script lang="ts">
    import {QRCodeReader} from "@dfinity/gix-components";
    import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
    import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
    import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
    import type { QrStatus } from '$lib/types/qr-code';
    import { onMount } from 'svelte';

    interface Props {
        onClose: () => void;
        address: string | undefined;
    }

    let {onClose, address = $bindable()}: Props = $props();

    let resolveQrCodePromise:
      | (({ status, code }: { status: QrStatus; code?: string }) => void)
      | undefined = undefined;

    onMount(async () => {
        await scanQrCode();
    });

    const scanQrCode = async () => {
        const result = await new Promise<{ status: QrStatus; code?: string | undefined }>((resolve) => {
            resolveQrCodePromise = resolve;
        });

        const { status, code } = result;

        if (status === 'success') {
            address = code;
        }

        onClose();
    }


    const onQRCode = ({ detail: code }: CustomEvent<string>) => {
        resolveQrCodePromise?.({ status: 'success', code });
        resolveQrCodePromise = undefined;
    };

    const onCancel = () => {
        resolveQrCodePromise?.({ status: 'cancelled' });
        resolveQrCodePromise = undefined;
    };
</script>

<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
    <div class="w-full h-full qr-code-wrapper md:min-h-[300px]">
        <QRCodeReader on:nnsCancel={onCancel} on:nnsQRCode={onQRCode} />
    </div>

    <ButtonGroup slot="toolbar">
        <ButtonCancel onclick={onClose} />
    </ButtonGroup>
</ContentWithToolbar>

<style lang="scss">
    .qr-code-wrapper {
        --primary-rgb: 50, 20, 105;
        color: rgba(var(--primary-rgb), 0.6);
    }
</style>
<script lang="ts">
    import {modalStore} from "$lib/stores/modal.store";
    import {Modal, QRCode} from "@dfinity/gix-components";
    import ContentWithToolbar from "$lib/components/ui/ContentWithToolbar.svelte";
    import ButtonCloseModal from "$lib/components/ui/ButtonCloseModal.svelte";
    import {i18n} from "$lib/stores/i18n.store";
    import {onMount} from "svelte";
    import {nonNullish} from "@dfinity/utils";
    import IconAstronautHelmet from "$lib/components/icons/IconAstronautHelmet.svelte";
    import {REFERRAL_CODE_COPY_BUTTON} from "$lib/constants/test-ids.constants";
    import ReceiveCopy from "$lib/components/receive/ReceiveCopy.svelte";
    import SkeletonText from "$lib/components/ui/SkeletonText.svelte";
    import MessageBox from "$lib/components/ui/MessageBox.svelte";
    import SkeletonQRCode from "$lib/components/ui/SkeletonQRCode.svelte";
    import SkeletonReceiveCopy from "$lib/components/receive/SkeletonReceiveCopy.svelte";

    let code: string;

    let referralCodeUrl;
    $: referralCodeUrl = `${window.location.origin}/?referral=${code}`;

    onMount(() => {
        code = "sadasdas"; // TODO load code from rewards canister
    });
</script>

<Modal on:nnsClose={modalStore.close}>
    <svelte:fragment slot="title"
        ><span class="text-xl">{$i18n.referral.invitation.text.title}</span>
    </svelte:fragment>

    <ContentWithToolbar>
        <div class="mx-auto mb-8 aspect-square h-80 max-h-[44vh] max-w-full rounded-xl bg-white p-4">
            {#if nonNullish(code)}
                <QRCode value={referralCodeUrl}>
                    <div slot="logo" class="flex items-center justify-center rounded-lg bg-primary p-2">
                        <IconAstronautHelmet />
                    </div>
                </QRCode>
            {:else}
                <SkeletonQRCode />
            {/if}
        </div>

        {#if nonNullish(code)}
            <div class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2">
                <output class="break-all">{referralCodeUrl}</output>
                <ReceiveCopy
                    address={referralCodeUrl}
                    copyAriaLabel={$i18n.referral.invitation.text.invitation_link_copied}
                    testId={REFERRAL_CODE_COPY_BUTTON}
                />
            </div>

            <span class="mb-6 block w-full pt-3 text-center text-sm text-tertiary">
                {$i18n.referral.invitation.text.not_referred_yet}
            </span>
        {:else}
            <div class="mb-6">
                <SkeletonReceiveCopy />

                <div class="pt-3">
                    <SkeletonText />
                </div>
            </div>
        {/if}

        <MessageBox level="info">
            {$i18n.referral.invitation.text.information}
        </MessageBox>

        <ButtonCloseModal isPrimary slot="toolbar" />
    </ContentWithToolbar>
</Modal>
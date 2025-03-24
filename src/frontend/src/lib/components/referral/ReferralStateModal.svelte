<script lang="ts">
    import {modalStore} from "$lib/stores/modal.store";
    import {Modal} from "@dfinity/gix-components";
    import ContentWithToolbar from "$lib/components/ui/ContentWithToolbar.svelte";
    import {i18n} from "$lib/stores/i18n.store";
    import Button from "$lib/components/ui/Button.svelte";
    import referralReward from "$lib/assets/referral-reward.svg";
    import {
        REFERRAL_STATE_MODAL_IMAGE_BANNER, REFERRAL_STATE_MODAL_SHARE_BUTTON
    } from "$lib/constants/test-ids.constants";
    import Img from "$lib/components/ui/Img.svelte";
    import Share from "$lib/components/ui/Share.svelte";
    import Sprinkles from "$lib/components/sprinkles/Sprinkles.svelte";
</script>

<Sprinkles />

<Modal on:nnsClose={modalStore.close}>
    <svelte:fragment slot="title">
        <span class="text-xl">{$i18n.referral.reward.text.title}</span>
    </svelte:fragment>

    <ContentWithToolbar>
        <Img
            src={referralReward}
            styleClass="w-full"
            testId={REFERRAL_STATE_MODAL_IMAGE_BANNER}
        />

        <div class="flex flex-col items-center gap-4 text-center">
            <h3 class="my-3">
                {$i18n.referral.reward.text.content_title}
            </h3>
            <span class="block w-full">
                {$i18n.referral.reward.text.content_text}
            </span>

            <Share
                testId={REFERRAL_STATE_MODAL_SHARE_BUTTON}
                text={$i18n.referral.reward.text.share}
                href={'URL to share'}
            />
        </div>

        <Button on:click={modalStore.close} colorStyle="secondary-light" fullWidth slot="toolbar">
            {$i18n.referral.reward.text.open_wallet}
        </Button>
    </ContentWithToolbar>
</Modal>
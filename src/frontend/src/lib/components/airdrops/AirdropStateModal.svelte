<script lang="ts">
    import { Modal } from '@dfinity/gix-components';
    import airdropJackpotReceived from '$lib/assets/airdrop-jackpot-received.svg';
    import airdropReceived from '$lib/assets/airdrop-received.svg';
    import Button from '$lib/components/ui/Button.svelte';
    import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
    import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
    import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
    import Share from '$lib/components/ui/Share.svelte';
    import { i18n } from '$lib/stores/i18n.store';
    import { modalStore } from '$lib/stores/modal.store';

    export let jackpot = false;
</script>

<Modal on:nnsClose={modalStore.close}>
    <ContentWithToolbar>
        <ImgBanner src={jackpot ? airdropJackpotReceived : airdropReceived} styleClass="aspect-auto" />

        <div class="gap-4 flex flex-col items-center">
            <h3 class="my-3 text-center"
            >{jackpot
                ? $i18n.airdrops.text.state_modal_title_jackpot
                : $i18n.airdrops.text.state_modal_title}</h3
            >
            <span class="block w-full text-center">{$i18n.airdrops.text.state_modal_content_text}</span>
            <Share
                    text={$i18n.airdrops.text.share}
                    href={jackpot
					? 'https://x.com/intent/post?text=I%20just%20discovered%20an%20OISY%20airdrop%20campaign%21%0AGo%20to%20OISY%3A%20https%3A%2F%2Foisy.com'
					: 'https://x.com/intent/post?text=I%20just%20discovered%20an%20OISY%20airdrop%20campaign%21%0AGo%20to%20OISY%3A%20https%3A%2F%2Foisy.com'}
            />
        </div>

        <ButtonGroup slot="toolbar">
            <Button on:click={modalStore.close} colorStyle="secondary"
            >{$i18n.airdrops.text.open_wallet}</Button
            >
        </ButtonGroup>
    </ContentWithToolbar>
</Modal>
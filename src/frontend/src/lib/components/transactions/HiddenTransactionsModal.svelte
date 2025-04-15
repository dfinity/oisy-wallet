<script lang="ts">
    import {modalStore} from "$lib/stores/modal.store.js";
    import {Html, Modal} from "@dfinity/gix-components";
    import {i18n} from "$lib/stores/i18n.store.js";
    import MessageBox from "$lib/components/ui/MessageBox.svelte";
    import AllTransactionsList from "$lib/components/transactions/AllTransactionsList.svelte";
</script>

<Modal on:nnsClose={modalStore.close}>
    <svelte:fragment slot="title">
        <span class="text-xl">{$i18n.transactions.text.hidden_transactions_title}</span>
    </svelte:fragment>

    <MessageBox level="info" closableKey="oisy_hide_hidden_transactions">
        <Html text={$i18n.transactions.text.hidden_transactions_info} />
    </MessageBox>

    <AllTransactionsList onlyMicroTransactions />
</Modal>
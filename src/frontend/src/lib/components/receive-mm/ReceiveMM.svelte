<script lang="ts">
    import IconAdd from '$lib/components/icons/IconAdd.svelte';
    import { addressNotLoaded } from '$lib/derived/address.derived';
    import { isBusy } from '$lib/derived/busy.derived';
    import {
        requestMetamaskAccounts,
        sendMetamaskTransaction
    } from '$lib/services/metamask.services';

    let disabled: boolean;
    let waitingForMMRequest = false;
    const MM_DEEPLINK_URL = import.meta.env.VITE_METAMASK_DEEPLINK_URL;

    $: disabled = $addressNotLoaded || $isBusy || waitingForMMRequest;

    const receiveFromMetamask = async () => {
        if (typeof window.ethereum === 'undefined') {
            window.open(MM_DEEPLINK_URL, '_blank');
            return;
        }

        waitingForMMRequest = true;
        try {
            const { success: accountRequestSuccess, accounts } = await requestMetamaskAccounts();
            if (!accountRequestSuccess) {
                return;
            }
            // afaik, MM and other Eth wallets don't provide additional qualifiers when sharing multiple accounts,
            // e.g., tagging a particular account as default or active, so it's up to the dApp to select an
            // account if multiple accounts are shared. Here I'm selecting the first one in the list.
            await sendMetamaskTransaction({fromAccount: accounts![0]});
        } finally {
            waitingForMMRequest = false;
        }
    }
</script>

<button
    class="flex-1 secondary"
    {disabled}
    class:opacity-50={disabled}
    on:click={receiveFromMetamask}
>
    <IconAdd size="28" />
    <span>Top up from Wallet</span>
</button>
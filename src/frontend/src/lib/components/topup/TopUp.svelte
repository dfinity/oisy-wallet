<script lang="ts">
    import IconAdd from '$lib/components/icons/IconAdd.svelte';
    import { addressStore } from '$lib/stores/address.store';
    import { addressNotLoaded } from '$lib/derived/address.derived';
    import { isBusy } from '$lib/derived/busy.derived';

	let disabled: boolean;
	let accounts: string[];
    let injectedProvider = false;

	$: disabled = $addressNotLoaded || $isBusy;

    if (typeof window.ethereum !== 'undefined') {
        injectedProvider = true;
    }

    async function receiveFromMetamask() {
        if (!injectedProvider) {
            window.open('https://metamask.app.link/dapp/oisy.ic0.app', "_blank");
            return;
        }

        disabled = true;
		try {
			accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
		} catch (err: any) {
			if (err.code === 4001) {
				// EIP-1193 userRejectedRequest error
				// If this happens, the user rejected the connection request.
				console.log('User rejected account sharing');
			} else {
				console.error(err);
			}
			disabled = false;
			return;
		}
		// MM requires the user to select at least one account
		const fromAccount: string = accounts[0];

		try {
			const transactionHash = await window.ethereum.request({
				method: 'eth_sendTransaction',
				params: [
					{
						from: fromAccount,
						to: $addressStore
					}
				]
			});
		} catch (err: any) {
			if (err.code === 4001) {
				// EIP-1193 userRejectedRequest error
				// If this happens, the user rejected the request
				console.log('User rejected transfer');
			} else {
				console.error(err);
			}
		}
		disabled = false;
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
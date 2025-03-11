<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { address as solAddress } from '@solana/web3.js';
	import { findAssociatedTokenPda } from '@solana-program/token';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { modalSolReceive } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import {
		solAddressDevnetStore,
		solAddressLocalnetStore,
		solAddressMainnetStore,
		solAddressTestnetStore,
		type StorageAddressData
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { SolAddress } from '$lib/types/address';
	import type { Token } from '$lib/types/token';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	export let token: Token;

	let addressData: StorageAddressData<SolAddress>;
	//TODO consolidate this logic together with btc into $networkAddress like it's done for ICP and ETH
	$: addressData = isNetworkIdSOLTestnet($networkId)
		? $solAddressTestnetStore
		: isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnetStore
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocalnetStore
				: $solAddressMainnetStore;

	const isDisabled = (): boolean => isNullish(addressData) || !addressData.certified;

	let ataAddress: SolAddress | undefined;

	const updateAtaAddress = async () => {
		[ataAddress] =
			nonNullish(addressData) && isTokenSpl(token)
				? await findAssociatedTokenPda({
						owner: solAddress(addressData.data),
						tokenProgram: solAddress(token.owner),
						mint: solAddress(token.address)
					})
				: [undefined];
	};

	$: token, updateAtaAddress();

	let address: SolAddress | undefined;
	$: address = nonNullish(ataAddress) ? ataAddress : addressData?.data;

	const openReceive = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openSolReceive(modalId);
	};
</script>

<ReceiveButtonWithModal open={openReceive} isOpen={$modalSolReceive}>
	<ReceiveModal
		slot="modal"
		{address}
		addressToken={token}
		network={token.network}
		copyAriaLabel={$i18n.receive.solana.text.solana_address_copied}
	/>
</ReceiveButtonWithModal>

<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { removeUserToken } from '$lib/api/backend.api';
	import { selectedChainId } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { token, tokenId } from '$lib/derived/token.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import HideTokenModal from '$lib/components/tokens/HideTokenModal.svelte';
	import type { Identity } from '@dfinity/agent';
    import {ETHEREUM_NETWORK_ID} from "$env/networks.env";

	const assertHide = (): { valid: boolean } => {
		const contractAddress = ($token as Erc20Token).address;

		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	const hideToken = async (params: { identity: Identity }) => {
		const contractAddress = ($token as Erc20Token).address;

		await removeUserToken({
			...params,
			tokenId: {
				chain_id: $selectedChainId,
				contract_address: contractAddress
			}
		});
	};

	const updateUi = () => erc20TokensStore.remove($tokenId);
</script>

<HideTokenModal backToNetworkId={ETHEREUM_NETWORK_ID} {assertHide} {hideToken} {updateUi} />

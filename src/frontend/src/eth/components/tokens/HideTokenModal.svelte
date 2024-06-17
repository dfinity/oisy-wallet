<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { removeUserToken } from '$lib/api/backend.api';
	import { selectedChainId } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { token } from '$lib/derived/token.derived';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import HideTokenModal from '$lib/components/tokens/HideTokenModal.svelte';
	import type { Identity } from '@dfinity/agent';
	import { ETHEREUM_NETWORK_ID } from '$env/networks.env';
	import { onMount } from 'svelte';
	import { assertNonNullish } from '@dfinity/utils';

	let selectedToken: OptionErc20Token;

	// We must clone the reference to avoid the UI to rerender once we remove the token from the store.
	onMount(() => (selectedToken = $token as OptionErc20Token));

	const assertHide = (): { valid: boolean } => {
		const contractAddress = selectedToken?.address;

		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	const hideToken = async (params: { identity: Identity }) => {
		const contractAddress = ($token as OptionErc20Token)?.address;

		await removeUserToken({
			...params,
			tokenId: {
				chain_id: $selectedChainId,
				contract_address: contractAddress
			}
		});
	};

	const updateUi = async () => {
		assertNonNullish(selectedToken);

		erc20TokensStore.remove(selectedToken.id);
	};
</script>

<HideTokenModal backToNetworkId={ETHEREUM_NETWORK_ID} {assertHide} {hideToken} {updateUi} />

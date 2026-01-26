<script lang="ts">
	import { assertNonNullish } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { loadCustomTokens } from '$eth/services/erc20.services';
	import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
	import HideTokenModal from '$lib/components/tokens/HideTokenModal.svelte';
	import {
		HIDE_TOKEN_MODAL_ROUTE,
		TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { token } from '$lib/stores/token.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();

	let selectedToken = $state<Erc20CustomToken | undefined>();

	// We must clone the reference to avoid the UI to rerender once we remove the token from the store.
	onMount(() => (selectedToken = $token as Erc20CustomToken));

	const onAssertHide = (): { valid: boolean } => {
		const contractAddress = selectedToken?.address;

		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	const onHideToken = async (params: { identity: Identity }) => {
		assertNonNullish(selectedToken);

		trackEvent({
			name: TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
			metadata: {
				tokenId: `${selectedToken.id.description}`,
				tokenSymbol: selectedToken.symbol,
				address: selectedToken.address,
				networkId: `${selectedToken.network.id.description}`,
				source: HIDE_TOKEN_MODAL_ROUTE
			}
		});

		await saveCustomTokens({
			...params,
			tokens: [
				{
					...selectedToken,
					chainId: selectedToken.network.chainId,
					networkKey: 'Erc20',
					enabled: false
				}
			]
		});
	};

	// TODO(GIX-2740): no call to Infura - remove only the selected token from stores
	const onUpdateUi = (params: { identity: Identity }): Promise<void> => loadCustomTokens(params);
</script>

<HideTokenModal {fromRoute} {onAssertHide} {onHideToken} {onUpdateUi} />

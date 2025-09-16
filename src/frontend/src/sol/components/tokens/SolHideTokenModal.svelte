<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { assertNonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import HideTokenModal from '$lib/components/tokens/HideTokenModal.svelte';
	import {
		HIDE_TOKEN_MODAL_ROUTE,
		TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { token } from '$lib/stores/token.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { saveCustomTokens } from '$sol/services/spl-custom-tokens.services';
	import type { SplCustomToken } from '$sol/types/spl-custom-token';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();

	let selectedToken = $state<SplCustomToken | undefined>();

	// We must clone the reference to avoid the UI to rerender once we remove the token from the store.
	onMount(() => (selectedToken = $token as SplCustomToken));

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

		await saveCustomTokens({ ...params, tokens: [{ ...selectedToken, enabled: false }] });
	};

	// UI gets updated automatically, resolve promise immediately
	const updateUi = (): Promise<void> => Promise.resolve();
</script>

<HideTokenModal {assertHide} {fromRoute} {hideToken} {updateUi} />

<script lang="ts">
	import { assertNonNullish, nonNullish } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount } from 'svelte';
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
	import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
	import { xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();

	let selectedToken = $state<XrpTrustLineCustomToken | undefined>();

	// We must clone the reference to avoid the UI to rerender once we remove the token from the store.
	onMount(() => (selectedToken = $token as XrpTrustLineCustomToken));

	const onAssertHide = (): { valid: boolean } => {
		if (isNullishOrEmpty(selectedToken?.currency) || isNullishOrEmpty(selectedToken?.issuer)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_token_address }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	// Hiding only saves the token as disabled: its trust line, and the reserve it holds, stay.
	const onHideToken = async (params: { identity: Identity }) => {
		assertNonNullish(selectedToken);

		trackEvent({
			name: TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
			metadata: {
				tokenId: `${selectedToken.id.description}`,
				tokenSymbol: selectedToken.symbol,
				...(nonNullish(selectedToken.name) && { tokenName: selectedToken.name }),
				tokenStandard: selectedToken.standard.code,
				address: xrpTrustLineIdentifier(selectedToken),
				networkId: `${selectedToken.network.id.description}`,
				source: HIDE_TOKEN_MODAL_ROUTE
			}
		});

		await saveCustomTokens({
			...params,
			tokens: [
				{
					...selectedToken,
					networkKey: 'XrpTrustLineMainnet',
					enabled: false
				}
			]
		});
	};

	// The reload inside `saveCustomTokens` updates the list, so there is nothing left to do.
	const onUpdateUi = (): Promise<void> => Promise.resolve();
</script>

<HideTokenModal {fromRoute} {onAssertHide} {onHideToken} {onUpdateUi} />

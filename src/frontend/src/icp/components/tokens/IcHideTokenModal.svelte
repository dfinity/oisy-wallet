<script lang="ts">
	import { assertNonNullish, nonNullish, toNullable } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
	import { Principal } from '@icp-sdk/core/principal';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import type { OptionIcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { setCustomToken } from '$lib/api/backend.api';
	import HideTokenModal from '$lib/components/tokens/HideTokenModal.svelte';
	import {
		HIDE_TOKEN_MODAL_ROUTE,
		TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { token } from '$lib/stores/token.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();

	let selectedToken = $state<OptionIcrcCustomToken>();

	// We must clone the reference to avoid the UI to rerender once we remove the token from the store.
	onMount(() => (selectedToken = $token as OptionIcrcCustomToken));

	let ledgerCanisterId = $derived(selectedToken?.ledgerCanisterId);

	let indexCanisterId = $derived(selectedToken?.indexCanisterId);

	let version = $derived(selectedToken?.version);

	const onAssertHide = (): { valid: boolean } => {
		if (isNullishOrEmpty(ledgerCanisterId)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_ledger }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	const onHideToken = async (params: { identity: Identity }) => {
		assertNonNullish(ledgerCanisterId);

		trackEvent({
			name: TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
			metadata: {
				ledgerCanisterId,
				indexCanisterId: `${indexCanisterId}`,
				networkId: 'ICP',
				source: HIDE_TOKEN_MODAL_ROUTE
			}
		});

		await setCustomToken({
			...params,
			token: {
				enabled: false,
				version: toNullable(version),
				section: toNullable(),
				allow_external_content_source: toNullable(),
				token: {
					Icrc: {
						ledger_id: Principal.fromText(ledgerCanisterId),
						index_id: toNullable(
							nonNullish(indexCanisterId) ? Principal.fromText(indexCanisterId) : undefined
						)
					}
				}
			},
			nullishIdentityErrorMessage: $i18n.auth.error.no_internet_identity
		});
	};

	const onUpdateUi = (params: { identity: Identity }): Promise<void> => loadCustomTokens(params);
</script>

<HideTokenModal {fromRoute} {onAssertHide} {onHideToken} {onUpdateUi} />

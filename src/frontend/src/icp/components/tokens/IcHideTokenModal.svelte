<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { Principal } from '@dfinity/principal';
	import { assertNonNullish, nonNullish, toNullable } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { OptionIcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { setCustomToken } from '$lib/api/backend.api';
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

	export let fromRoute: NavigationTarget | undefined;

	let selectedToken: OptionIcrcCustomToken;

	// We must clone the reference to avoid the UI to rerender once we remove the token from the store.
	onMount(() => (selectedToken = $token as OptionIcrcCustomToken));

	let ledgerCanisterId: LedgerCanisterIdText | undefined;
	$: ledgerCanisterId = selectedToken?.ledgerCanisterId;

	let indexCanisterId: LedgerCanisterIdText | undefined;
	$: indexCanisterId = selectedToken?.indexCanisterId;

	let version: bigint | undefined;
	$: version = selectedToken?.version;

	const assertHide = (): { valid: boolean } => {
		if (isNullishOrEmpty(ledgerCanisterId)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_ledger }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	const hideToken = async (params: { identity: Identity }) => {
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

	const updateUi = (params: { identity: Identity }): Promise<void> => loadCustomTokens(params);
</script>

<HideTokenModal {assertHide} {fromRoute} {hideToken} {updateUi} />

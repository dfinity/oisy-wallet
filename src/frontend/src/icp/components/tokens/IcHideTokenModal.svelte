<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { removeUserToken, setCustomToken } from '$lib/api/backend.api';
	import { selectedChainId } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { token, tokenId } from '$lib/derived/token.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import HideTokenModal from '$lib/components/tokens/HideTokenModal.svelte';
	import type { Identity } from '@dfinity/agent';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { IcToken } from '$icp/types/ic';
	import { assertNonNullish } from '@dfinity/utils';
	import { Principal } from '@dfinity/principal';
	import { icrcTokensStore } from '$icp/stores/icrc.store';
    import {ETHEREUM_NETWORK_ID, ICP_NETWORK_ID} from "$env/networks.env";

	let ledgerCanisterId: LedgerCanisterIdText | undefined;
	$: ledgerCanisterId = ($token as IcToken).ledgerCanisterId;

	let indexCanisterId: LedgerCanisterIdText | undefined;
	$: indexCanisterId = ($token as IcToken).indexCanisterId;

	const assertHide = (): { valid: boolean } => {
		if (isNullishOrEmpty(ledgerCanisterId)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_ledger }
			});
			return { valid: false };
		}

		if (isNullishOrEmpty(indexCanisterId)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_index }
			});
			return { valid: false };
		}

		return { valid: true };
	};

	const hideToken = async (params: { identity: Identity }) => {
		assertNonNullish(ledgerCanisterId);
		assertNonNullish(indexCanisterId);

		await setCustomToken({
			...params,
			token: {
				enabled: false,
				token: {
					Icrc: {
						ledger_id: Principal.fromText(ledgerCanisterId),
						index_id: Principal.fromText(indexCanisterId)
					}
				}
			}
		});
	};

	const updateUi = () => {
		assertNonNullish(ledgerCanisterId);

		icrcTokensStore.reset(ledgerCanisterId);
	};
</script>

<HideTokenModal backToNetworkId={ICP_NETWORK_ID} {assertHide} {hideToken} {updateUi} />

<script lang="ts">
	import { loadCkEthMinterInfo } from '$icp-eth/services/cketh.services';
	import { erc20ToCkErc20Enabled, ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { icrcTokensStore } from '$icp/stores/icrc.store';
	import {
		IC_CKETH_MINTER_CANISTER_ID,
		LOCAL_CKETH_MINTER_CANISTER_ID,
		STAGING_CKETH_MINTER_CANISTER_ID
	} from '$env/networks.ircrc.env';
	import { SEPOLIA_TOKEN_ID } from '$env/tokens.env';
	import { LOCAL } from '$lib/constants/app.constants';
	import { isNullish } from '@dfinity/utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { TokenId } from '$lib/types/token';
	import { i18n } from '$lib/stores/i18n.store';

	export let convertTokenId: TokenId;

	const load = async () => {
		if (!$ethToCkETHEnabled && !$erc20ToCkErc20Enabled) {
			return;
		}

		// TODO: this is relatively ugly. Should we create a derived store or another abstraction that merge EthToken and CkCanisters?

		const minterCanisterId =
			convertTokenId === SEPOLIA_TOKEN_ID
				? LOCAL
					? LOCAL_CKETH_MINTER_CANISTER_ID
					: STAGING_CKETH_MINTER_CANISTER_ID
				: IC_CKETH_MINTER_CANISTER_ID;

		if (isNullish(minterCanisterId)) {
			toastsError({
				msg: {
					text: $i18n.convert.error.loading_cketh_helper
				}
			});
			return;
		}

		// TODO: this duplicate the ckETH worker, maybe we reuse the work on Ethereum as well?

		await loadCkEthMinterInfo({
			tokenId: convertTokenId,
			canisters: {
				minterCanisterId
			}
		});
	};

	$: $ethToCkETHEnabled,
		$erc20ToCkErc20Enabled,
		$icrcTokensStore,
		convertTokenId,
		(async () => await load())();
</script>

<slot />

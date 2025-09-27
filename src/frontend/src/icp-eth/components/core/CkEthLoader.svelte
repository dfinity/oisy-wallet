<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { run } from 'svelte/legacy';
	import {
		IC_CKETH_MINTER_CANISTER_ID,
		LOCAL_CKETH_MINTER_CANISTER_ID,
		STAGING_CKETH_MINTER_CANISTER_ID
	} from '$env/networks/networks.icrc.env';
	import { SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env.js';
	import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
	import { erc20ToCkErc20Enabled, ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { loadCkEthMinterInfo } from '$icp-eth/services/cketh.services';
	import { LOCAL } from '$lib/constants/app.constants';
	import { networkEthereumDisabled, networkSepoliaDisabled } from '$lib/derived/networks.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { TokenId } from '$lib/types/token';

	interface Props {
		nativeTokenId: TokenId;
		isSendFlow?: boolean;
		children?: Snippet;
	}

	let { nativeTokenId, isSendFlow = false, children }: Props = $props();

	const load = async () => {
		if (
			(nativeTokenId === ETHEREUM_TOKEN_ID && $networkEthereumDisabled) ||
			(nativeTokenId === SEPOLIA_TOKEN_ID && $networkSepoliaDisabled)
		) {
			return;
		}

		if (!isSendFlow && !$ethToCkETHEnabled && !$erc20ToCkErc20Enabled) {
			return;
		}

		// TODO: this is relatively ugly. Should we create a derived store or another abstraction that merge EthToken and CkCanisters?

		const minterCanisterId =
			nativeTokenId === SEPOLIA_TOKEN_ID
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
			tokenId: nativeTokenId,
			canisters: {
				minterCanisterId
			}
		});
	};

	run(() => {
		($networkEthereumDisabled,
			$networkSepoliaDisabled,
			$ethToCkETHEnabled,
			$erc20ToCkErc20Enabled,
			$icrcDefaultTokensStore,
			nativeTokenId,
			isSendFlow,
			(async () => await load())());
	});
</script>

{@render children?.()}

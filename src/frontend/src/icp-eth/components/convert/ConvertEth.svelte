<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import { erc20UserTokens } from '$eth/derived/erc20.derived';
	import { isNotSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { autoLoadIcrcToken } from '$icp-eth/services/icrc-token.services';
	import { autoLoadErc20Token } from '$icp-eth/services/erc20-token.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { networkICP } from '$lib/derived/network.derived';
	import { networkEthereumDisabled, networkSepoliaDisabled } from '$lib/derived/networks.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TokenId } from '$lib/types/token';

	interface Props {
		nativeTokenId: TokenId;
		ariaLabel: string;
		icon: Snippet;
		label: Snippet;
	}

	let { nativeTokenId, ariaLabel, icon, label }: Props = $props();

	const ethModalId = Symbol();
	const ckEthModalId = Symbol();

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	let isNetworkDisabled = $derived(
		(nativeTokenId === ETHEREUM_TOKEN_ID && $networkEthereumDisabled) ||
			(nativeTokenId === SEPOLIA_TOKEN_ID && $networkSepoliaDisabled)
	);

	const isDisabled = (): boolean =>
		isNetworkDisabled ||
		$ethAddressNotLoaded ||
		// We can convert to ETH - i.e. we can convert to Ethereum or Sepolia, not an ERC20 token
		isNotSupportedEthTokenId(nativeTokenId) ||
		isNullish(toCkEthHelperContractAddress($ckEthMinterInfoStore?.[nativeTokenId])) ||
		($networkICP && isNullish($ckEthMinterInfoStore?.[nativeTokenId]));

	const openConvert = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		if ($networkICP) {
			const { result: resultUserToken } = await autoLoadErc20Token({
				erc20UserTokens: $erc20UserTokens,
				sendToken: $tokenWithFallback,
				identity: $authIdentity
			});

			if (resultUserToken === 'error') {
				return;
			}

			modalStore.openConvertToTwinTokenEth(ethModalId);
			return;
		}

		const { result: resultCustomToken } = await autoLoadIcrcToken({
			icrcCustomTokens: $icrcTokens,
			sendToken: $tokenWithFallback,
			identity: $authIdentity
		});

		if (resultCustomToken === 'error') {
			return;
		}

		modalStore.openConvertToTwinTokenCkEth(ckEthModalId);
	};
</script>

<CkEthLoader {nativeTokenId}>
	<ButtonHero
		{ariaLabel}
		disabled={isNetworkDisabled || $isBusy || $outflowActionsDisabled}
		{icon}
		{label}
		onclick={async () => await openConvert()}
	/>
</CkEthLoader>

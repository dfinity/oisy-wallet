<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
	import { erc20UserTokens } from '$eth/derived/erc20.derived';
	import { isNotSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { autoLoadCustomToken } from '$icp-eth/services/custom-token.services';
	import { autoLoadUserToken } from '$icp-eth/services/user-token.services';
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

	export let nativeTokenId: TokenId;
	export let ariaLabel: string;

	const { outflowActionsDisabled } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	const isDisabled = (): boolean =>
		(nativeTokenId === ETHEREUM_TOKEN_ID && $networkEthereumDisabled) ||
		(nativeTokenId === SEPOLIA_TOKEN_ID && $networkSepoliaDisabled) ||
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
			const { result: resultUserToken } = await autoLoadUserToken({
				erc20UserTokens: $erc20UserTokens,
				sendToken: $tokenWithFallback,
				identity: $authIdentity
			});

			if (resultUserToken === 'error') {
				return;
			}

			modalStore.openConvertToTwinTokenEth();
			return;
		}

		const { result: resultCustomToken } = await autoLoadCustomToken({
			icrcCustomTokens: $icrcTokens,
			sendToken: $tokenWithFallback,
			identity: $authIdentity
		});

		if (resultCustomToken === 'error') {
			return;
		}

		modalStore.openConvertToTwinTokenCkEth();
	};
</script>

<CkEthLoader {nativeTokenId}>
	<ButtonHero
		on:click={async () => await openConvert()}
		disabled={$isBusy || $outflowActionsDisabled}
		{ariaLabel}
	>
		<slot name="icon" slot="icon" />
		<slot />
	</ButtonHero>
</CkEthLoader>

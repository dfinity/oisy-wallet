<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_MAINNET_NETWORK_ID, ICP_NETWORK } from '$env/networks.env';
	import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens.erc20.env';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import {
		isCkToken,
		isTokenCkBtcLedger,
		isTokenCkErc20Ledger,
		isTokenCkEthLedger
	} from '$icp/utils/ic-send.utils';
	import {
		ckErc20HelperContractAddress,
		ckEthHelperContractAddress
	} from '$icp-eth/derived/cketh.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { ethAddress } from '$lib/derived/address.derived';
	import type { Token } from '$lib/types/token';
	import { isNetworkETH, isNetworkICP } from '$lib/utils/network.utils';

	export let token: Token;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;

	/**
	 * Send context store
	 */

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let convertEth = false;
	$: convertEth =
		(token.standard === 'ethereum' || isTokenCkEthLedger(token)) && $erc20UserTokensInitialized;

	let convertErc20 = false;
	$: convertErc20 =
		(ERC20_TWIN_TOKENS_IDS.includes(token.id) || isTokenCkErc20Ledger(token)) &&
		$erc20UserTokensInitialized;

	let convertBtc = false;
	$: convertBtc = isTokenCkBtcLedger(token) && $erc20UserTokensInitialized;
</script>

<div class="flex w-full justify-center pt-10">
	{#if convertEth}
		{#if isNetworkICP(token.network)}
			<IcSendTokenWizard
				{currentStep}
				destination={$ethAddress ?? ''}
				networkId={$sendToken.network.id}
				bind:sendProgressStep
				on:icBack
				on:icNext
				on:icClose
				on:icQRCodeScan
				on:icQRCodeBack
			/>
		{:else if isNetworkETH(token.network)}
			<EthSendTokenWizard
				{currentStep}
				destination={$ckEthHelperContractAddress ?? ''}
				targetNetwork={ICP_NETWORK}
				bind:sendProgressStep
				on:icBack
				on:icNext
				on:icClose
				on:icQRCodeScan
				on:icQRCodeBack
			/>
		{/if}
	{/if}

	{#if convertErc20}
		{#if isNetworkICP(token.network)}
			<IcSendTokenWizard
				{currentStep}
				destination={$ethAddress ?? ''}
				networkId={$sendToken.network.id}
				bind:sendProgressStep
				on:icBack
				on:icNext
				on:icClose
				on:icQRCodeScan
				on:icQRCodeBack
			/>
		{:else if isNetworkETH(token.network)}
			<EthSendTokenWizard
				{currentStep}
				destination={$ckErc20HelperContractAddress ?? ''}
				targetNetwork={ICP_NETWORK}
				bind:sendProgressStep
				on:icBack
				on:icNext
				on:icClose
				on:icQRCodeScan
				on:icQRCodeBack
			/>
		{/if}
	{/if}

	{#if convertBtc}
		<IcSendTokenWizard
			{currentStep}
			networkId={nonNullish(token) && isCkToken(token)
				? (token.twinToken?.network.id ?? BTC_MAINNET_NETWORK_ID)
				: BTC_MAINNET_NETWORK_ID}
			bind:sendProgressStep
			on:icBack
			on:icNext
			on:icClose
			on:icQRCodeScan
			on:icQRCodeBack
		/>
	{/if}
</div>

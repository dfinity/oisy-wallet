<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SwapEthFeeInfo from './SwapEthFeeInfo.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import NewSwapForm from '$lib/components/swap/NewSwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		nativeEthereumToken: Token;
		isSwapAmountsLoading: boolean;
		isApproveNeeded: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		nativeEthereumToken,
		isSwapAmountsLoading,
		isApproveNeeded,
		onShowTokensList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let errorType: TokenActionErrorType = $state<TokenActionErrorType | undefined>(undefined);

	const {
		feeStore: storeFeeData,
		minGasFee,
		maxGasFee,
		feeSymbolStore,
		feeDecimalsStore,
		feeTokenIdStore
	} = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	// TODO: improve this fee calculation at the source, depending on the method (or methods) that is going to be used
	const totalFee = $derived(
		isApproveNeeded && nonNullish($maxGasFee) ? $maxGasFee * 2n : $maxGasFee
	);

	const customValidate = (userAmount: bigint): TokenActionErrorType | undefined => {
		if (isNullish($storeFeeData) || isNullish($sourceToken?.id)) {
			return;
		}

		// We should align the $sendBalance and userAmount to avoid issues caused by comparing formatted and unformatted BN
		const parsedSendBalance =
			nonNullish($sourceToken) && nonNullish($sourceTokenBalance)
				? parseToken({
						value: formatToken({
							value: $sourceTokenBalance,
							unitName: $sourceToken.decimals,
							displayDecimals: $sourceToken.decimals
						}),
						unitName: $sourceToken.decimals
					})
				: ZERO;

		// If ETH, the balance should cover the user entered amount plus the min gas fee
		if (isSupportedEthTokenId($sourceToken?.id) || isSupportedEvmNativeTokenId($sourceToken?.id)) {
			const total = userAmount + ($minGasFee ?? ZERO);

			if (total > parsedSendBalance) {
				return 'insufficient-funds-for-fee';
			}
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount > parsedSendBalance) {
			return 'insufficient-funds';
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO;
		if (nonNullish($maxGasFee) && ethBalance < $maxGasFee) {
			return 'insufficient-funds-for-fee';
		}
	};
</script>

<NewSwapForm
	{errorType}
	fee={totalFee}
	{isSwapAmountsLoading}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
>
	{#snippet swapDetails()}
		{#if nonNullish($destinationToken) && nonNullish($sourceToken) && nonNullish($feeTokenIdStore)}
			<Hr spacing="md" />

			{#if $sourceToken.network.id !== $destinationToken.network.id}
				<MessageBox styleClass="sm:text-sm">
					<Html
						text={replacePlaceholders($i18n.swap.text.cross_chain_networks_info, {
							$sourceNetwork: $sourceToken.network.name,
							$destinationNetwork: $destinationToken.network.name
						})}
					/>
				</MessageBox>
			{/if}

			<div class="flex flex-col gap-3">
				<SwapProvider {slippageValue} on:icShowProviderList />
				<EthFeeDisplay {isApproveNeeded}>
					{#snippet label()}
						<Html text={$i18n.fee.text.total_fee} />
					{/snippet}
				</EthFeeDisplay>

				<SwapEthFeeInfo
					decimals={$feeDecimalsStore}
					feeSymbol={$feeSymbolStore}
					feeTokenId={$feeTokenIdStore}
				/>
			</div>
		{/if}
	{/snippet}
</NewSwapForm>

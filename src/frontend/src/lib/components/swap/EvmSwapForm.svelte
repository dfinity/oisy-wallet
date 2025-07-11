<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_SLIPPAGE_INVALID_VALUE } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { formatToken } from '$lib/utils/format.utils';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { Token } from '$lib/types/token';
	import ContentWithToolbar from '../ui/ContentWithToolbar.svelte';
	import NewSwapForm from './NewSwapForm.svelte';
	import Hr from '../ui/Hr.svelte';
	import SwapProvider from './SwapProvider.svelte';
	import SwapFees from './SwapFees.svelte';
	import ButtonGroup from '../ui/ButtonGroup.svelte';
	import ButtonCancel from '../ui/ButtonCancel.svelte';
	import Button from '../ui/Button.svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { Html } from '@dfinity/gix-components';
	import SwapEthFeeInfo from './SwapEthFeeInfo.svelte';
	import MessageBox from '../ui/MessageBox.svelte';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		nativeEthereumToken: Token;
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		nativeEthereumToken
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenId, sourceTokenBalance } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let error = $state<Error | undefined>();

	let insufficientFunds = $derived(nonNullish(error));

	const {
		feeStore: storeFeeData,
		minGasFee,
		maxGasFee,
		feeSymbolStore,
		feeDecimalsStore,
		feeTokenIdStore
	} = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	/**
	 * Reevaluate max amount if user has used the "Max" button and the fees are changing.
	 */

	let swapAmountsLoading = $derived(
		nonNullish(swapAmount) && nonNullish($swapAmountsStore?.amountForSwap)
			? Number(swapAmount) !== Number($swapAmountsStore.amountForSwap)
			: false
	);

	let invalid: boolean = $derived(
		isNullish(swapAmount) ||
			Number(swapAmount) <= 0 ||
			isNullish(receiveAmount) ||
			swapAmountsLoading ||
			// nonNullish(insufficientFunds) ||
			(nonNullish(slippageValue) && Number(slippageValue) >= SWAP_SLIPPAGE_INVALID_VALUE)
	);

	const dispatch = createEventDispatcher();

	const customErrorValidate = (userAmount: bigint): Error | undefined => {
		if (
			isNullish($storeFeeData) ||
			isNullish($sourceTokenId) ||
			isNullish($balancesStore?.[$sourceTokenId]?.data)
		) {
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
		if (isSupportedEthTokenId($sourceTokenId) || isSupportedEvmNativeTokenId($sourceTokenId)) {
			const total = userAmount + ($minGasFee ?? ZERO);

			if (total > parsedSendBalance) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		// If ERC20, the balance of the token - e.g. 20 DAI - should cover the amount entered by the user
		if (userAmount > parsedSendBalance) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_amount);
		}

		// Finally, if ERC20, the ETH balance should be less or greater than the max gas fee
		const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO;
		if (nonNullish($maxGasFee) && ethBalance < $maxGasFee) {
			return new InsufficientFundsError(
				$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees
			);
		}
	};

	const VeloraProvider = {
		website: 'https://app.velora.xyz/',
		name: 'Velora',
		logo: '/images/dapps/velora-logo.svg'
	};
</script>

<ContentWithToolbar>
	<NewSwapForm
		on:icClose
		on:icNext
		on:icShowTokensList
		on:icShowProviderList
		bind:swapAmount
		bind:receiveAmount
		bind:slippageValue
		{customErrorValidate}
		fee={$maxGasFee}
		{error}
		{swapAmountsLoading}
	/>

	{#if nonNullish($destinationToken) && nonNullish($sourceToken) && nonNullish($feeTokenIdStore)}
		<Hr spacing="md" />

		{#if $sourceToken.network.id !== $destinationToken.network.id}
			<MessageBox styleClass="sm:text-sm">
				<Html text={`You move tokens from <b>Ethereum</b> to <b>Base</b> network`} />
			</MessageBox>
		{/if}

		<div class="flex flex-col gap-3">
			<SwapProvider
				on:icShowProviderList
				showSelectButton
				{slippageValue}
				provider={VeloraProvider}
			/>

			<EthFeeDisplay>
				<Html slot="label" text="Total estimated fee" />
			</EthFeeDisplay>

			<SwapEthFeeInfo
				feeSymbol={$feeSymbolStore}
				decimals={$feeDecimalsStore}
				feeTokenId={$feeTokenIdStore}
			/>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={() => dispatch('icClose')} />

			<Button disabled={invalid} onclick={() => dispatch('icNext')}>
				{$i18n.swap.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

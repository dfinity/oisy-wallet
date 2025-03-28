<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import { tokenCkErc20Ledger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { IcAmountAssertionError } from '$icp/types/ic-send';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import { assertCkBTCUserInputAmount } from '$icp/utils/ckbtc.utils';
	import {
		assertCkETHBalanceEstimatedFee,
		assertCkETHMinFee,
		assertCkETHMinWithdrawalAmount
	} from '$icp/utils/cketh.utils';
	import { ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO_BI } from '$lib/constants/app.constants';
	import { balance } from '$lib/derived/balances.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	export let amount: OptionAmount = undefined;
	export let amountError: IcAmountAssertionError | undefined;
	export let networkId: NetworkId | undefined = undefined;

	const { sendToken, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee: bigint | undefined;
	$: fee = ($sendToken as OptionIcToken)?.fee;

	let exchangeValueUnit: DisplayUnit = 'usd';
	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';

	const { store: ethereumFeeStore } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	const customValidate = (userAmount: bigint): Error | undefined => {
		if (isNullish(fee) || isNullish($sendToken)) {
			return;
		}

		if (isNetworkIdBitcoin(networkId)) {
			const error = assertCkBTCUserInputAmount({
				amount: userAmount,
				minterInfo: $ckBtcMinterInfoStore?.[$sendToken.id],
				tokenDecimals: $sendToken.decimals,
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}
		}

		// if CkEth, asset the minimal withdrawal amount is met and the amount should at least be bigger than the fee.
		if (isNetworkIdEthereum(networkId) && $tokenCkEthLedger) {
			const error = assertCkETHMinWithdrawalAmount({
				amount: userAmount,
				tokenDecimals: $sendToken.decimals,
				tokenSymbol: $sendToken.symbol,
				minterInfo: $ckEthMinterInfoStore?.[$ckEthereumNativeTokenId],
				i18n: $i18n
			});

			if (nonNullish(error)) {
				return error;
			}

			return assertCkETHMinFee({
				amount: userAmount,
				tokenSymbol: $sendToken.symbol,
				fee,
				i18n: $i18n
			});
		}

		const assertBalance = (): IcAmountAssertionError | undefined => {
			const total = userAmount + (fee ?? ZERO_BI);

			if (total > ($balance ?? ZERO_BI)) {
				return new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
			}

			return undefined;
		};

		// if CkErc20, the entered amount should be covered by fee + balance and the ckEth balance should cover the estimated fee.
		if (isNetworkIdEthereum(networkId) && $tokenCkErc20Ledger) {
			const error = assertBalance();

			if (nonNullish(error)) {
				return error;
			}

			const errorEstimatedFee = assertCkETHBalanceEstimatedFee({
				balance: nonNullish($ethereumFeeTokenCkEth)
					? $balancesStore?.[$ethereumFeeTokenCkEth.id]?.data
					: undefined,
				tokenCkEth: $ethereumFeeTokenCkEth,
				feeStoreData: $ethereumFeeStore,
				i18n: $i18n
			});

			if (nonNullish(errorEstimatedFee)) {
				return errorEstimatedFee;
			}

			return undefined;
		}

		return assertBalance();
	};
</script>

<div class="mb-4">
	<TokenInput
		token={$sendToken}
		bind:amount
		displayUnit={inputUnit}
		isSelectable={false}
		exchangeRate={$sendTokenExchangeRate}
		bind:error={amountError}
		customErrorValidate={customValidate}
		autofocus={nonNullish($sendToken)}
	>
		<span slot="title">{$i18n.core.text.amount}</span>

		<svelte:fragment slot="amount-info">
			{#if nonNullish($sendToken)}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={$sendTokenExchangeRate}
						token={$sendToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="balance">
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					bind:amount
					error={nonNullish(amountError)}
					balance={$sendBalance}
					token={$sendToken}
					fee={fee ?? ZERO_BI}
				/>
			{/if}
		</svelte:fragment>
	</TokenInput>
</div>

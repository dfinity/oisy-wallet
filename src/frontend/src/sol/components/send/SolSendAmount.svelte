<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TESTNET_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { invalidAmount } from '$lib/utils/input.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';
	import { SOLANA_TRANSACTION_FEE_IN_LAMPORTS } from '$sol/constants/sol.constants';
	import { SolAmountAssertionError } from '$sol/types/sol-send';

	export let amount: OptionAmount = undefined;
	export let amountError: SolAmountAssertionError | undefined;

	const { sendToken, sendBalance, sendTokenDecimals, sendTokenStandard, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const fee = SOLANA_TRANSACTION_FEE_IN_LAMPORTS;

	let solanaNativeToken: Token;
	$: solanaNativeToken = isNetworkIdSOLTestnet($sendTokenNetworkId)
		? SOLANA_TESTNET_TOKEN
		: isNetworkIdSOLDevnet($sendTokenNetworkId)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sendTokenNetworkId)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN;

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (invalidAmount(userAmount.toNumber()) || userAmount.isZero()) {
			return new SolAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (nonNullish($sendBalance) && $sendTokenStandard === 'solana') {
			const total = userAmount.add(fee ?? ZERO);

			if (total.gt($sendBalance)) {
				return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_gas);
			}

			return;
		}

		if (userAmount.gt($sendBalance ?? ZERO)) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds);
		}

		const solBalance = $balancesStore?.[solanaNativeToken.id]?.data ?? ZERO;
		if (nonNullish(fee) && solBalance.lt(fee)) {
			return new InsufficientFundsError(
				$i18n.send.assertion.insufficient_solana_funds_to_cover_the_fees
			);
		}
	};

	$: calculateMax = (): number | undefined =>
		isNullish($sendToken)
			? undefined
			: getMaxTransactionAmount({
					balance: $sendBalance ?? ZERO,
					fee: BigNumber.from(fee),
					tokenDecimals: $sendTokenDecimals,
					tokenStandard: $sendTokenStandard
				});
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$sendTokenDecimals}
	{customValidate}
	{calculateMax}
	bind:error={amountError}
/>

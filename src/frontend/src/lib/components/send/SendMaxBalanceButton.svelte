<script lang="ts">
    import { debounce, isNullish, nonNullish } from '@dfinity/utils';
    import { BigNumber } from '@ethersproject/bignumber';
    import { getContext } from 'svelte';
    import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
    import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
    import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
    import { i18n } from '$lib/stores/i18n.store';
    import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
    import type { OptionAmount } from '$lib/types/send';
    import { getMaxTransactionAmount } from '$lib/utils/token.utils';

    export let sendAmount: OptionAmount;
    export let amountSetToMax = false;
    export let error: Error | undefined = undefined;

    const { sendBalance, sendToken, isSendTokenIcrc2 } = getContext<SendContext>(SEND_CONTEXT_KEY);

    const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

    let sendTokenFee: bigint | undefined;
    $: sendTokenFee = nonNullish($sendToken) ? $icTokenFeeStore?.[$sendToken.symbol] : undefined;

    let isZeroBalance: boolean;
    $: isZeroBalance = isNullish($sendBalance) || $sendBalance.isZero();

    let maxAmount: number | undefined;
    $: maxAmount =
        nonNullish($sendToken) && nonNullish($sendBalance)
            ? getMaxTransactionAmount({
                balance: $sendBalance,
                // multiply sendTokenFee by two if it's an icrc2 token to cover transfer and approval fees
                fee: BigNumber.from((sendTokenFee ?? 0n) * (isSendTokenIcrc2 ? 2n : 1n)),
                tokenDecimals: $sendToken.decimals,
                tokenStandard: $sendToken.standard
            })
            : undefined;

    const setMax = () => {
        if (!isZeroBalance && nonNullish(maxAmount)) {
            amountSetToMax = true;
            sendAmount = maxAmount;
        }
    };

    /**
     * Reevaluate max amount if user has used the "Max" button and sendTokenFee is changing.
     */
    const debounceSetMax = () => {
        if (!amountSetToMax) {
            return;
        }
        debounce(() => setMax(), 500)();
    };

    $: sendTokenFee, debounceSetMax();
</script>

<button
        class="font-semibold text-brand-primary transition-all"
        on:click|preventDefault={setMax}
        class:text-error-primary={isZeroBalance || nonNullish(error)}
        class:text-brand-primary={!isZeroBalance && isNullish(error)}
        data-tid={MAX_BUTTON}
>
    {$i18n.send.text.max_balance}:
    {nonNullish(maxAmount) && nonNullish($sendToken)
        ? `${maxAmount} ${$sendToken.symbol}`
        : $i18n.send.text.not_available}
</button>
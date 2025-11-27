<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
    import {getContext, untrack} from 'svelte';
	import { icrcAccount } from '$icp/derived/ic.derived';
	import { isUserMintingAccount } from '$icp/services/icrc-minting.services';
	import { IcAmountAssertionError } from '$icp/types/ic-send';
	import type { IcToken, OptionIcToken } from '$icp/types/ic-token';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	interface Props {
		amount: OptionAmount;
		amountError?: IcAmountAssertionError;
		onTokensList: () => void;
	}

	let { amount = $bindable(), amountError = $bindable(), onTokensList }: Props = $props();

	const { sendToken, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee = $derived(($sendToken as OptionIcToken)?.fee);

	let exchangeValueUnit = $state<DisplayUnit>('usd');

	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let isMintingAccount = $state(false);

	const updateMintingAccountStatus = async () => {
		isMintingAccount = await isUserMintingAccount({
			identity: $authIdentity,
			account: $icrcAccount,
			token: $sendToken as IcToken
		});
	};

	$effect(() => {
        [$authIdentity, $icrcAccount, $sendToken];

		console.log('updateMintingAccountStatus');
        untrack(() => updateMintingAccountStatus());
	});

	const customValidate = (userAmount: bigint): Error | undefined => {
		if (isNullish(fee) || isNullish($sendToken)) {
			return;
		}

		// If the user is the minting account, it does not require any balance to send tokens.
		// Any token sent from a minting account is considered a Mint transaction.
		if (isMintingAccount) {
			return;
		}

		const assertBalance = (): IcAmountAssertionError | undefined => {
			const total = userAmount + (fee ?? ZERO);

			if (total > ($sendBalance ?? ZERO)) {
				return new IcAmountAssertionError($i18n.send.assertion.insufficient_funds);
			}

			return;
		};

		return assertBalance();
	};
</script>

<div class="mb-4">
	<TokenInput
		autofocus={nonNullish($sendToken)}
		displayUnit={inputUnit}
		exchangeRate={$sendTokenExchangeRate}
		onClick={onTokensList}
		onCustomErrorValidate={customValidate}
		token={$sendToken}
		bind:amount
		bind:error={amountError}
	>
		{#snippet title()}{$i18n.core.text.amount}{/snippet}

		{#snippet amountInfo()}
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
		{/snippet}

		{#snippet balance()}
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					fee={fee ?? ZERO}
					token={$sendToken}
					bind:amount
				/>
			{/if}
		{/snippet}
	</TokenInput>
</div>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import { cmcDepositAccountCanisterIds } from '$icp/derived/cycles-top-up.derived';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { getTopUpCanisterId } from '$icp/utils/cycles-top-up.utils';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { NANO_SECONDS_IN_SECOND, ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';

	interface Props {
		transaction: IcTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let {
		type,
		typeLabel: transactionTypeLabel,
		value,
		timestamp: timestampNanoseconds,
		incoming,
		to,
		from,
		fee,
		approveSpender,
		tokenId
	} = $derived(transaction);

	let pending = $derived(transaction?.status === 'pending');

	let status: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	let displayAmount = $derived(
		type === 'approve'
			? (fee ?? ZERO) * -1n
			: nonNullish(value)
				? incoming
					? value
					: (value + (fee ?? ZERO)) * -1n
				: value
	);

	let timestamp = $derived(
		nonNullish(timestampNanoseconds)
			? Number(timestampNanoseconds / NANO_SECONDS_IN_SECOND)
			: undefined
	);

	let mintingAccountAddress = $derived(
		isIcToken(token) && nonNullish(token.mintingAccount)
			? encodeIcrcAccount(token.mintingAccount)
			: undefined
	);

	let listFrom = $derived(
		type === 'mint' && nonNullish(mintingAccountAddress) ? mintingAccountAddress : from
	);

	let listTo = $derived(
		type === 'burn' && nonNullish(mintingAccountAddress) ? mintingAccountAddress : to
	);

	// A top-up lists the canister that got the cycles, not where the tokens went. An ICP
	// top-up's tokens go to the CMC's deposit account for the canister, which is never shown.
	let topUp = $derived(transactionTypeLabel === 'transaction.label.top_up');

	let topUpCanisterId = $derived(
		getTopUpCanisterId({
			transaction,
			cmcDepositAccountCanisterIds: $cmcDepositAccountCanisterIds
		})
	);

	const modalId = Symbol();
</script>

<Transaction
	addressPrefixLabel={topUp ? $i18n.transaction.text.canister : undefined}
	{approveSpender}
	{displayAmount}
	from={listFrom}
	{iconType}
	onClick={() => modalStore.openIcTransaction({ id: modalId, data: { transaction, token } })}
	{status}
	styleClass="block w-full border-0"
	{timestamp}
	to={topUp ? topUpCanisterId : listTo}
	{token}
	{tokenId}
	{type}
	unknownAddressLabel={topUp ? $i18n.transaction.text.canister_unknown : undefined}
>
	<IcTransactionLabel amount={value} label={transactionTypeLabel} {token} {type} />
</Transaction>

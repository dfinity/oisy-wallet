<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { IcTransactionType } from '$icp/types/ic-transaction';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		label?: string;
		type?: IcTransactionType;
		token: OptionToken;
		amount?: bigint;
	}

	const { label, type, token, amount }: Props = $props();

	let fallbackLabel: string = $derived(nonNullish(type) ? $i18n.transaction.type[type] : '');

	let twinToken: Token | undefined = $derived((token as OptionIcCkToken)?.twinToken);

	let labelText: string = $derived(
		type === 'approve' && nonNullish(amount)
			? $i18n.transaction.text.approve_label
			: nonNullish(label)
				? resolveText({ i18n: $i18n, path: label })
				: fallbackLabel
	);

	let approveAmount = $derived(
		nonNullish(amount) && nonNullish(token)
			? `${formatToken({ value: amount ?? ZERO, displayDecimals: token.decimals, unitName: token.decimals })} ${getTokenDisplaySymbol(token)}`
			: undefined
	);
</script>

{replacePlaceholders(labelText, {
	$twinToken: twinToken?.symbol ?? '',
	$twinNetwork: twinToken?.network.name ?? '',
	$ckToken: token?.symbol ?? '',
	...(nonNullish(approveAmount) && { $approveAmount: approveAmount })
})}

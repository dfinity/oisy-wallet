import IconConvert from '$lib/components/icons/IconConvert.svelte';
import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
import IconReceive from '$lib/components/icons/IconReceive.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
import type { TransactionStatus, TransactionType } from '$lib/types/transaction';
import type { ComponentType } from 'svelte';

export const mapTransactionIcon = ({
	type,
	status
}: {
	type: TransactionType;
	status: TransactionStatus;
}): ComponentType => {
	const isConversionFrom = type === 'withdraw' || type === 'mint';

	const isConversionTo = type === 'deposit' || type === 'burn' || type === 'approve';

	const isPendingConversion = (isConversionFrom || isConversionTo) && status === 'pending';

	return isPendingConversion
		? IconConvert
		: isConversionFrom
			? IconConvertFrom
			: isConversionTo
				? IconConvertTo
				: type === 'send'
					? IconSend
					: IconReceive;
};

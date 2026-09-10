<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { SUPPORT_ICPSWAP_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
	import type { IcpSwapRecoverableBalance } from '$lib/services/icp-swap-recovery.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		balance: IcpSwapRecoverableBalance;
		disabled?: boolean;
		loading?: boolean;
		// The pool the row belongs to. A scan can surface the same token from two pools, so the
		// ledger id alone no longer identifies a row.
		testIdSuffix?: string;
		onWithdraw: () => void;
	}

	let { balance, disabled = false, loading = false, testIdSuffix, onWithdraw }: Props = $props();

	let { token, amount } = $derived(balance);

	let formattedAmount = $derived(formatToken({ value: amount, unitName: token.decimals }));

	let testId = $derived(
		`${SUPPORT_ICPSWAP_WITHDRAW_BUTTON}-${nonNullish(testIdSuffix) ? `${testIdSuffix}-` : ''}${token.ledgerCanisterId}`
	);
</script>

<div class="mt-3 flex w-full flex-row items-center justify-between gap-3">
	<span class="flex min-w-0 flex-1 flex-row items-center gap-2">
		<TokenLogo data={token} logoSize="xs" />
		<span class="flex min-w-0 flex-col">
			<span class="truncate">{formattedAmount} {token.symbol}</span>
			<span class="truncate text-sm text-tertiary">{$i18n.support.text.balance_unused}</span>
		</span>
	</span>

	<!-- Button is flex-1 by default, which would let the loading state stretch across the row. -->
	<Button
		ariaLabel={replacePlaceholders($i18n.support.alt.withdraw, { $symbol: token.symbol })}
		{disabled}
		link
		{loading}
		onclick={onWithdraw}
		styleClass="flex-none"
		{testId}
	>
		{$i18n.support.text.withdraw} >
	</Button>
</div>

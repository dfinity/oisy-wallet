<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TESTNET_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { SOLANA_TRANSACTION_FEE_IN_LAMPORTS } from '$sol/constants/sol.constants';

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let solanaNativeToken: Token;
	$: solanaNativeToken = isNetworkIdSOLTestnet($sendTokenNetworkId)
		? SOLANA_TESTNET_TOKEN
		: isNetworkIdSOLDevnet($sendTokenNetworkId)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sendTokenNetworkId)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN;

	$: ({ decimals, symbol } = solanaNativeToken);

	const fee = SOLANA_TRANSACTION_FEE_IN_LAMPORTS;
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish(fee) && nonNullish(decimals) && nonNullish(symbol)}
		{formatToken({
			value: BigNumber.from(fee),
			unitName: decimals,
			displayDecimals: decimals
		})}
		{symbol}
	{/if}
</Value>

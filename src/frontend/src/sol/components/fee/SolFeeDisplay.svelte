<script lang="ts">
	import { assertNonNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { Lamports } from '@solana/rpc-types';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TESTNET_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { getSolCreateAccountFee } from '$sol/api/solana.api';
	import { SOLANA_TRANSACTION_FEE_IN_LAMPORTS } from '$sol/constants/sol.constants';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';

	export let showAtaFee = false;

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

	let ataFee: Lamports | undefined = undefined;

	const updateAtaFee = async () => {
		if (!showAtaFee) {
			ataFee = undefined;
			return;
		}

		const solNetwork = mapNetworkIdToNetwork($sendTokenNetworkId);

		assertNonNullish(
			solNetwork,
			replacePlaceholders($i18n.init.error.no_solana_network, {
				$network: $sendTokenNetworkId.description ?? ''
			})
		);

		ataFee = await getSolCreateAccountFee(solNetwork);
	};

	$: showAtaFee, $sendTokenNetworkId, updateAtaFee();
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

{#if showAtaFee && nonNullish(ataFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="ataFee">
			<svelte:fragment slot="label">{$i18n.fee.text.ata_fee}</svelte:fragment>

			{#if nonNullish(decimals) && nonNullish(symbol)}
				{formatToken({
					value: BigNumber.from(ataFee),
					unitName: decimals,
					displayDecimals: decimals
				})}
				{symbol}
			{/if}
		</Value>
	</div>
{/if}

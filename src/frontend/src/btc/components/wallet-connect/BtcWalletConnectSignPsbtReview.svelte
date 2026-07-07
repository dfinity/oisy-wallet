<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletConnectBtcDecodedPsbt } from '$btc/types/wallet-connect';
	import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		application: string;
		source: string;
		decoded: WalletConnectBtcDecodedPsbt | undefined;
		decodeError: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let { application, source, decoded, decodeError, onApprove, onReject }: Props = $props();

	const formatBtc = (value: bigint): string =>
		`${formatToken({ value, unitName: BTC_DECIMALS, displayDecimals: BTC_DECIMALS })} ${$i18n.wallet_connect.text.btc_symbol}`;
</script>

<ContentWithToolbar>
	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.application}</p>
	<p class="mb-4 font-normal">{application}</p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.signing_address}</p>
	<p class="mb-4 font-normal"><output class="break-all">{source}</output></p>

	{#if decodeError || isNullish(decoded)}
		<p class="mb-4 font-normal text-error-primary">
			{$i18n.wallet_connect.error.btc_psbt_decode}
		</p>
	{:else}
		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.psbt_inputs}</p>
		<ul class="mb-4 list-none p-0">
			{#each decoded.inputs as input, index (index)}
				<li class="mb-1 break-all">
					<output>{input.address ?? $i18n.wallet_connect.text.psbt_unknown_address}</output>
					— {nonNullish(input.value)
						? formatBtc(input.value)
						: $i18n.wallet_connect.text.psbt_unknown_value}
					{#if input.signedByWallet}
						<span class="font-bold">({$i18n.wallet_connect.text.psbt_signed_by_wallet})</span>
					{/if}
				</li>
			{/each}
		</ul>

		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.psbt_outputs}</p>
		<ul class="mb-4 list-none p-0">
			{#each decoded.outputs as output, index (index)}
				<li class="mb-1 break-all">
					<output>{output.address ?? $i18n.wallet_connect.text.psbt_unknown_address}</output>
					— {formatBtc(output.value)}
				</li>
			{/each}
		</ul>

		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.psbt_total_signed_inputs}</p>
		<p class="mb-4 font-normal">{formatBtc(decoded.totalSignedInputs)}</p>

		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.fee}</p>
		<p class="mb-4 font-normal">
			{nonNullish(decoded.fee)
				? formatBtc(decoded.fee)
				: $i18n.wallet_connect.text.psbt_fee_unknown}
		</p>

		<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.psbt_broadcast}</p>
		<p class="mb-4 font-normal">
			{decoded.broadcast
				? $i18n.wallet_connect.text.psbt_broadcast_enabled
				: $i18n.wallet_connect.text.psbt_broadcast_disabled}
		</p>

		{#if decoded.broadcast}
			<p class="mb-4 font-normal text-error-primary">
				{$i18n.wallet_connect.text.psbt_broadcast_unsupported_note}
			</p>
		{/if}
	{/if}

	{#snippet toolbar()}
		<WalletConnectActions
			approve={!decodeError && nonNullish(decoded) && !decoded.broadcast}
			{onApprove}
			{onReject}
		/>
	{/snippet}
</ContentWithToolbar>

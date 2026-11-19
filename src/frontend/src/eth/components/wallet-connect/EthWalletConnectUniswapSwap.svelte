<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { UNISWAP_FULL_PRECISION_DENOMINATOR } from '$eth/constants/uniswap.constants';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { UniswapSwap, UniswapSwapFee } from '$eth/types/uniswap';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import SendDataApplication from '$lib/components/send/SendDataApplication.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import {
		formatSecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		swap: UniswapSwap;
		application: string;
		network: EthereumNetwork;
		sourceNetwork: Snippet;
		// The network fee rows, which follow the swap's own.
		children?: Snippet;
	}

	let { swap, application, network, sourceNetwork, children }: Props = $props();

	let { router, paid, received, recipient, fees, approval, deadline } = $derived(swap);

	let routerExplorerUrl = $derived(`${getExplorerUrl({ network })}/address/${router.address}`);

	const formatDate = (seconds: number): string =>
		formatSecondsToDate({ seconds, language: $currentLanguage });

	// A share too small for the precision shown is stated as below it: as 0%, it would read as no fee,
	// though the router pays it.
	const formatShare = (share: bigint): string => {
		const percent = new Intl.NumberFormat($currentLanguage, {
			style: 'percent',
			maximumFractionDigits: 4
		});
		const shown = percent.format(Number(share) / Number(UNISWAP_FULL_PRECISION_DENOMINATOR));

		return share > ZERO && shown === percent.format(0) ? `< ${percent.format(0.000_001)}` : shown;
	};

	// Every amount is stated in full: rounded, it could read as more than a minimum the router
	// enforces, or as less than what the wallet pays, a fee or an allowance.
	const inFull = ({ amount, token: { decimals } }: { amount: bigint; token: Token }): string =>
		formatToken({ value: amount, unitName: decimals, displayDecimals: decimals });

	// A share of what the router holds is stated as a percentage: the amount it comes to is only known
	// once the swap has run.
	const formatFee = (fee: UniswapSwapFee): string =>
		'share' in fee
			? replacePlaceholders($i18n.wallet_connect.text.swap_app_fee_share, {
					$share: formatShare(fee.share),
					$symbol: fee.token.symbol
				})
			: `${inFull(fee)} ${fee.token.symbol}`;

	// The allowance outlives the transaction, so it is stated with when it ends.
	let allowance = $derived(
		nonNullish(approval)
			? replacePlaceholders(
					approval.unlimited
						? $i18n.wallet_connect.text.swap_allowance_unlimited
						: $i18n.wallet_connect.text.swap_allowance_amount,
					{
						$amount: inFull(approval),
						$symbol: approval.token.symbol,
						$date: formatDate(approval.expiration)
					}
				)
			: undefined
	);
</script>

<SendDataApplication {application} />

{@render sourceNetwork()}

<WalletConnectModalValue
	label={paid.atMost
		? $i18n.wallet_connect.text.swap_pay_at_most
		: $i18n.wallet_connect.text.swap_pay}
	ref="swap-pay"
>
	<span class="break-all">{`${inFull(paid)} ${paid.token.symbol}`}</span>
</WalletConnectModalValue>

<WalletConnectModalValue label={$i18n.wallet_connect.text.swap_receive_at_least} ref="swap-receive">
	<span class="break-all">{`${inFull(received)} ${received.token.symbol}`}</span>
</WalletConnectModalValue>

{#if nonNullish(recipient)}
	<SendDataSpender
		label={$i18n.wallet_connect.text.swap_recipient}
		ref="swap-recipient"
		spender={recipient}
	/>
{/if}

{#each fees as fee, index (index)}
	<WalletConnectModalValue
		label={$i18n.wallet_connect.text.swap_app_fee}
		ref={`swap-app-fee-${index}`}
	>
		<div class="flex flex-col gap-0.5">
			<span>{formatFee(fee)}</span>
			<output class="break-all">{fee.recipient}</output>
		</div>
	</WalletConnectModalValue>
{/each}

{#if nonNullish(allowance)}
	<WalletConnectModalValue label={$i18n.wallet_connect.text.swap_allowance} ref="swap-allowance">
		{allowance}
	</WalletConnectModalValue>
{/if}

<WalletConnectModalValue label={$i18n.wallet_connect.text.swap_valid_until} ref="swap-deadline">
	{nonNullish(deadline) ? formatDate(deadline) : $i18n.wallet_connect.text.swap_no_deadline}
</WalletConnectModalValue>

<!-- The router is what gives the summary its meaning, so it is named with the address it is pinned
     at, which the user can check and look up. -->
<WalletConnectModalValue label={$i18n.wallet_connect.text.interacting_with} ref="swap-router">
	<div class="flex flex-col gap-0.5">
		<span>
			{replacePlaceholders($i18n.wallet_connect.text.swap_router, { $version: router.version })}
		</span>

		<span class="flex flex-wrap items-center">
			<output>{shortenWithMiddleEllipsis({ text: router.address })}</output>

			<AddressActions
				copyAddress={router.address}
				copyAddressText={$i18n.wallet.text.address_copied}
				externalLink={routerExplorerUrl}
				externalLinkAriaLabel={$i18n.wallet_connect.alt.open_address_block_explorer}
				inline
			/>
		</span>
	</div>
</WalletConnectModalValue>

{@render children?.()}

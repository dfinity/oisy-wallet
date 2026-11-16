<script lang="ts">
	import {
		hexStringToUint8Array,
		isNullish,
		nonNullish,
		uint8ArrayToHexString
	} from '@dfinity/utils';
	import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
	import { Principal } from '@icp-sdk/core/principal';
	import type { Pool } from '@liquidium/client';
	import { getContext } from 'svelte';
	import { LIQUIDIUM_ENABLED } from '$env/liquidium';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import EthFeePriority from '$eth/components/fee/EthFeePriority.svelte';
	import EthWalletConnectCallMethods from '$eth/components/wallet-connect/EthWalletConnectCallMethods.svelte';
	import EthWalletConnectUniswapSwap from '$eth/components/wallet-connect/EthWalletConnectUniswapSwap.svelte';
	import {
		ETH_WALLET_CONNECT_GAS_BASELINE_FLOOR,
		ETH_WALLET_CONNECT_GAS_NOTICE_MULTIPLIER,
		ETH_WALLET_CONNECT_GAS_WARNING_MULTIPLIER
	} from '$eth/constants/eth.constants';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import {
		loadUnlistedErc20TokenData,
		type UnlistedErc20TokenData
	} from '$eth/services/erc20-unlisted.services';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthCall } from '$eth/types/wallet-connect';
	import { toUnlistedErc20Token, unlistedErc20Name } from '$eth/utils/erc20-unlisted.utils';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import { decodeErc20AbiData, decodeSetApprovalForAllData } from '$eth/utils/transactions.utils';
	import { isWalletConnectEthTokenCallWithValue } from '$eth/utils/wallet-connect.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import WalletConnectAcknowledgement from '$lib/components/wallet-connect/WalletConnectAcknowledgement.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import WalletConnectScamWarning from '$lib/components/wallet-connect/WalletConnectScamWarning.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadLiquidiumInflowPool } from '$lib/services/liquidium.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { maxBigInt } from '$lib/utils/bigint.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		amount: bigint;
		destination: string;
		application: string;
		data?: string;
		// What the calldata says this request is. Every state below is derived from it, so a request
		// whose calldata OISY cannot read arrives here as `unknown` and is reviewed as unknown,
		// rather than falling through to the native summary the way it used to.
		call: WalletConnectEthCall;
		// The gas limit the dApp asked for, when it asked for one. It is what gets signed, so it is
		// also what the maximum fee below is priced on.
		requestedGas?: bigint;
		sourceNetwork: EthereumNetwork;
		targetNetwork?: Network;
		// WalletConnect's Verify API flags the requesting site as a scam: the review says so and
		// offers Reject only.
		flaggedAsScam?: boolean;
		approveDisabled?: boolean;
		// Ticked by the user to confirm they sign a call OISY can't read. The review holds Approve
		// until then, and signing checks it again.
		unknownCallAcknowledged?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		application,
		data,
		call,
		requestedGas,
		sourceNetwork: sourceNetworkProp,
		targetNetwork,
		flaggedAsScam = false,
		approveDisabled = false,
		unknownCallAcknowledged = $bindable(false),
		onApprove,
		onReject
	}: Props = $props();

	const { feeStore }: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	// Unused gas is refunded, so a high limit is not a fee on its own. It is a ceiling the user
	// authorizes, and a contract that consumes all of it burns the whole amount, which is why the
	// review prices the limit that will be signed rather than the one OISY would have used.
	let signedGas = $derived(requestedGas ?? $feeStore?.gas);

	let baselineGas = $derived(maxBigInt(ETH_WALLET_CONNECT_GAS_BASELINE_FLOOR, $feeStore?.gas));

	// A request that carries no limit of its own is signed with the estimate, so there is nothing to
	// judge and the review says nothing about it.
	let highGasLimit = $derived(
		nonNullish(requestedGas) &&
			requestedGas >= baselineGas * ETH_WALLET_CONNECT_GAS_WARNING_MULTIPLIER
	);

	let dappGasLimit = $derived(
		!highGasLimit &&
			nonNullish(requestedGas) &&
			requestedGas >= baselineGas * ETH_WALLET_CONNECT_GAS_NOTICE_MULTIPLIER
	);

	let erc20Approve = $derived(call.type === 'erc20Approve');

	let erc20Transfer = $derived(call.type === 'erc20Transfer');

	let setApprovalForAll = $derived(call.type === 'setApprovalForAll');

	// `increaseAllowance` and `decreaseAllowance` carry `(address spender, uint256 delta)`, the same
	// arguments as `approve`, so they resolve their token, decode their spender and fail closed
	// through the very same path. Only the copy differs, because the amount is a change to the
	// allowance rather than the allowance itself.
	let allowanceDelta = $derived(call.type === 'erc20AllowanceDelta');

	let allowanceIncrease = $derived(call.type === 'erc20AllowanceDelta' && call.increase);

	let unknownCall = $derived(call.type === 'unknown');

	// A deposit to the ckETH helper contract only reaches this review as `ckEthDeposit` when the
	// principal it mints to is the user's own, so the principal shown is the one the calldata names.
	let ckEthDepositPrincipal = $derived(call.type === 'ckEthDeposit' ? call.principal : undefined);

	let ckEthDepositRefused = $derived(call.type === 'ckEthDepositRefused');

	let ckEthHelperUnconfirmed = $derived(call.type === 'ckEthHelperUnconfirmed');

	// A deposit to the minter's helper that deposits to a subaccount mints to whichever account it
	// names, so the account is stated as the calldata names it and the notice says whether it is the
	// user's own.
	let ckDeposit = $derived(call.type === 'ckDeposit' ? call.deposit : undefined);

	let ckDepositRefused = $derived(call.type === 'ckDepositRefused');

	// Another account can still be the user's own account on Liquidium: a pool of it, in the
	// subaccount that credits the user's Liquidium profile. Which pools and which profile those are is
	// read from Liquidium, as OISY's own Liquidium supply reads them. Kept as text so that the read
	// runs again only when the account changes, not whenever the request is classified anew.
	let liquidiumInflowOwner = $derived(
		LIQUIDIUM_ENABLED &&
			nonNullish(ckDeposit) &&
			!ckDeposit.ownAccount &&
			nonNullish(ckDeposit.subaccount)
			? ckDeposit.owner.toText()
			: undefined
	);

	let liquidiumInflowSubaccount = $derived(
		nonNullish(liquidiumInflowOwner) && nonNullish(ckDeposit?.subaccount)
			? uint8ArrayToHexString(ckDeposit.subaccount)
			: undefined
	);

	let liquidiumInflowCkTokenSymbol = $derived(
		nonNullish(liquidiumInflowOwner) ? ckDeposit?.ckTokenSymbol : undefined
	);

	type LiquidiumPoolRead =
		{ status: 'loading' } | { status: 'loaded'; pool: Pool | undefined } | { status: 'failed' };

	let liquidiumPoolRead = $state<LiquidiumPoolRead | undefined>();

	$effect(() => {
		if (
			isNullish(liquidiumInflowOwner) ||
			isNullish(liquidiumInflowSubaccount) ||
			isNullish(liquidiumInflowCkTokenSymbol) ||
			isNullish($authIdentity) ||
			isNullish($ethAddress)
		) {
			liquidiumPoolRead = undefined;
			return;
		}

		// A read that a newer one replaced must not overwrite it when it answers late.
		let current = true;

		liquidiumPoolRead = { status: 'loading' };

		loadLiquidiumInflowPool({
			identity: $authIdentity,
			ethAddress: $ethAddress,
			owner: Principal.fromText(liquidiumInflowOwner),
			subaccount: hexStringToUint8Array(liquidiumInflowSubaccount),
			ckTokenSymbol: liquidiumInflowCkTokenSymbol
		})
			.then((pool) => {
				if (current) {
					liquidiumPoolRead = { status: 'loaded', pool };
				}
			})
			.catch(() => {
				// Liquidium not answering says nothing about whose account it is, so the deposit is
				// reviewed as one to any other account.
				if (current) {
					liquidiumPoolRead = { status: 'failed' };
				}
			});

		return () => {
			current = false;
		};
	});

	let liquidiumPoolLoading = $derived(liquidiumPoolRead?.status === 'loading');

	let liquidiumPool = $derived(
		liquidiumPoolRead?.status === 'loaded' ? liquidiumPoolRead.pool : undefined
	);

	let ckDepositToUser = $derived(
		nonNullish(ckDeposit) && (ckDeposit.ownAccount || nonNullish(liquidiumPool))
	);

	let ckDepositNotice = $derived(
		nonNullish(ckDeposit)
			? replacePlaceholders(
					ckDeposit.ownAccount
						? $i18n.wallet_connect.text.ck_deposit
						: nonNullish(liquidiumPool)
							? $i18n.wallet_connect.text.ck_deposit_liquidium
							: $i18n.wallet_connect.text.ck_deposit_other_account,
					{ $token: ckDeposit.token.symbol, $ckToken: ckDeposit.ckTokenSymbol }
				)
			: undefined
	);

	let swap = $derived(call.type === 'uniswapSwap' ? call.swap : undefined);

	// Each states something the summary rows cannot carry on their own, so several can show at once.
	let swapToOtherAddress = $derived(nonNullish(swap?.recipient));

	let swapWithoutMinimum = $derived(swap?.received.amount === ZERO);

	// Judged when the review opens, against this device's clock. The deadline itself is a row of the
	// summary, so the box is the only part that depends on the clock being right.
	let swapExpired = $derived(nonNullish(swap?.deadline) && swap.deadline < Date.now() / 1000);

	let erc20 = $derived(erc20Approve || erc20Transfer || allowanceDelta);

	let decodedErc20Data = $derived.by(() => {
		if (!erc20 || isNullish(data)) {
			return;
		}

		try {
			return decodeErc20AbiData({ data });
		} catch (_: unknown) {
			// Calldata that does not decode must not be summarized: the review would
			// otherwise describe something else than what gets signed and broadcast.
		}
	});

	let spender = $derived(erc20Approve || allowanceDelta ? decodedErc20Data?.to : undefined);

	let decodedSetApprovalForAll = $derived.by(() => {
		if (!setApprovalForAll || isNullish(data)) {
			return;
		}

		try {
			return decodeSetApprovalForAllData(data);
		} catch (_: unknown) {
			// Calldata that does not decode must not be summarized: the review would
			// otherwise describe something else than what gets signed and broadcast.
		}
	});

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// The tokens OISY lists, enabled or not, and the ones the user added.
	let listedToken = $derived(
		erc20
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: destination, networkId }) &&
						networkId === sourceNetworkProp.id
				)
			: undefined
	);

	// Any other token is stated in what its own contract reports. Calldata that does not decode has
	// no amount to state, so there is nothing to read for it.
	let readsUnlistedToken = $derived(
		erc20 && isNullish(listedToken) && nonNullish(decodedErc20Data)
	);

	type UnlistedTokenRead =
		| { status: 'loading' }
		| { status: 'loaded'; data: UnlistedErc20TokenData }
		| { status: 'failed' };

	let unlistedTokenRead = $state<UnlistedTokenRead | undefined>();

	$effect(() => {
		if (!readsUnlistedToken) {
			unlistedTokenRead = undefined;
			return;
		}

		// A read that a newer one replaced must not overwrite it when it answers late.
		let current = true;

		unlistedTokenRead = { status: 'loading' };

		loadUnlistedErc20TokenData({
			address: destination,
			networkId: sourceNetworkProp.id,
			owner: $ethAddress ?? undefined
		})
			.then((data) => {
				if (current) {
					unlistedTokenRead = isNullish(data) ? { status: 'failed' } : { status: 'loaded', data };
				}
			})
			.catch(() => {
				if (current) {
					unlistedTokenRead = { status: 'failed' };
				}
			});

		return () => {
			current = false;
		};
	});

	let unlistedTokenLoading = $derived(unlistedTokenRead?.status === 'loading');

	let unlistedTokenData = $derived(
		unlistedTokenRead?.status === 'loaded' ? unlistedTokenRead.data : undefined
	);

	let unlistedToken = $derived(
		nonNullish(unlistedTokenData)
			? toUnlistedErc20Token({
					address: destination,
					network: sourceNetworkProp,
					decimals: unlistedTokenData.decimals,
					name: unlistedErc20Name({
						symbol: unlistedTokenData.symbol,
						unknownTokenLabel: $i18n.transaction.text.unknown_token,
						unknownTokenNamedLabel: $i18n.transaction.text.unknown_token_named
					})
				})
			: undefined
	);

	let token = $derived(erc20 ? (listedToken ?? unlistedToken) : (ckDeposit?.token ?? $sendToken));

	let tokenExplorerUrl = $derived(
		`${getExplorerUrl({ network: sourceNetworkProp })}/token/${destination}`
	);

	let amountDisplay = $derived(erc20 ? decodedErc20Data?.value : (ckDeposit?.amount ?? amount));

	// A transfer moves tokens to the address encoded in the calldata, not to the
	// contract the transaction is addressed to. Any other token call is addressed to the token
	// itself, which for a token OISY does not list has a row of its own, with its controls.
	let destinationDisplay = $derived(
		erc20Transfer ? (decodedErc20Data?.to ?? null) : nonNullish(unlistedToken) ? null : destination
	);

	// Fail closed: without both the token and its decoded calldata, the review cannot state what
	// the user would actually approve. This covers approve as well as transfer, since an
	// undecodable approve would otherwise render as a zero-amount interaction and stay approvable.
	let unverifiableErc20 = $derived(erc20 && (isNullish(decodedErc20Data) || isNullish(token)));

	// The summary of a token call states the token amount, so native value sent along with it would
	// have no line of its own. The request is refused, and the notice states that amount instead.
	let tokenCallWithValue = $derived(isWalletConnectEthTokenCallWithValue({ call, value: amount }));

	let tokenCallValue = $derived(
		replacePlaceholders($i18n.wallet_connect.text.token_call_with_value, {
			$amount: `${formatToken({ value: amount, unitName: $sendToken.decimals })} ${$sendToken.symbol}`,
			$symbol: $sendToken.symbol
		})
	);

	// Same reasoning for an operator grant: the operator is the whole of what is being authorized,
	// and calldata that hides it would otherwise fall through to a native zero-value summary.
	let unverifiableSetApprovalForAll = $derived(
		setApprovalForAll && isNullish(decodedSetApprovalForAll)
	);

	// An operator grant authorizes rather than moves, so it has no amount and no balance to spend
	// against. Native value carried alongside it is still real value leaving the wallet, and hiding
	// that would repeat, in the other direction, the summary this review exists to prevent.
	// A call OISY could not read is in the same position: the native value is all the review knows,
	// and a zero there is not a summary of the request. Printing "0 ETH" as the amount of an
	// unreviewed contract call is the misstatement this review exists to prevent, so the row is
	// dropped rather than filled with a figure that describes nothing. A deposit held until OISY can
	// check it is in the same position: a token deposit sends no native value at all.
	let noAmount = $derived(
		(setApprovalForAll || unknownCall || ckEthHelperUnconfirmed) && amount === ZERO
	);

	let balance = $derived(
		nonNullish(unlistedToken)
			? unlistedTokenData?.balance
			: nonNullish(token)
				? $balancesStore?.[token.id]?.data
				: undefined
	);

	// A balance the contract did not report is left out rather than shown as zero.
	let unlistedBalanceUnknown = $derived(nonNullish(unlistedToken) && isNullish(balance));

	// Names the fee rows for a screen reader. A `label` cannot do it: it only labels form controls,
	// so its `for` would be ignored here and the group would be announced without a name.
	const FEE_SECTION_LABEL = 'fee-label';

	let activeTab = $state('summary');
</script>

<!-- Shared by the swap summary and the send summary. -->
{#snippet sourceNetwork()}
	<WalletConnectModalValue label={$i18n.send.text.source_network} ref="source-network">
		<NetworkWithLogo network={sourceNetworkProp} />
	</WalletConnectModalValue>
{/snippet}

<!-- The fee is two rows that belong together, so it takes a heading like every other block in the
     summary rather than trailing loose off the end of it. -->
{#snippet fee()}
	<span id={FEE_SECTION_LABEL} class="font-bold">{$i18n.fee.text.fee}</span>

	<div class="mb-4" aria-labelledby={FEE_SECTION_LABEL} role="group">
		<EthFeePriority gas={signedGas} styleClass="mb-2" />

		<EthFeeDisplay estimated gas={signedGas}>
			{#snippet label()}
				<!-- "Fee" is the heading above; repeating it in the row would say it twice. -->
				{$i18n.fee.text.estimated}
			{/snippet}
		</EthFeeDisplay>
	</div>
{/snippet}

<ContentWithToolbar>
	{#if flaggedAsScam}
		<WalletConnectScamWarning />
	{/if}

	{#if ckEthDepositRefused}
		<MessageBox level="error" testId="wallet-connect-cketh-deposit-refused">
			{$i18n.wallet_connect.text.cketh_deposit_refused}
		</MessageBox>
	{:else if ckEthHelperUnconfirmed}
		<MessageBox level="warning" testId="wallet-connect-cketh-helper-unconfirmed">
			{$i18n.wallet_connect.text.cketh_helper_unconfirmed}
		</MessageBox>
	{:else if nonNullish(ckEthDepositPrincipal)}
		<MessageBox level="info" testId="wallet-connect-cketh-deposit">
			{$i18n.wallet_connect.text.cketh_deposit}
		</MessageBox>
	{:else if ckDepositRefused}
		<MessageBox level="error" testId="wallet-connect-ck-deposit-refused">
			{$i18n.wallet_connect.text.ck_deposit_refused}
		</MessageBox>
	{:else if nonNullish(ckDeposit) && !liquidiumPoolLoading}
		<!-- A deposit to another account is one OISY signs, so the notice warns rather than refuses. -->
		<MessageBox
			level={ckDepositToUser ? 'info' : 'warning'}
			testId={ckDeposit.ownAccount
				? 'wallet-connect-ck-deposit'
				: nonNullish(liquidiumPool)
					? 'wallet-connect-ck-deposit-liquidium'
					: 'wallet-connect-ck-deposit-other-account'}
		>
			{ckDepositNotice}
		</MessageBox>
	{:else if unknownCall}
		<WalletConnectAcknowledgement
			testId="wallet-connect-unknown-call"
			text={$i18n.wallet_connect.text.unknown_call}
			bind:acknowledged={unknownCallAcknowledged}
		/>
	{:else if tokenCallWithValue}
		<MessageBox level="error" testId="wallet-connect-token-call-with-value">
			{tokenCallValue}
		</MessageBox>
	{:else if unverifiableErc20 && !unlistedTokenLoading}
		<MessageBox level="warning" testId="wallet-connect-unverifiable-erc20-warning">
			{$i18n.wallet_connect.text.unverifiable_erc20_request}
		</MessageBox>
	{:else if unverifiableSetApprovalForAll}
		<MessageBox level="warning" testId="wallet-connect-unverifiable-approval-for-all-warning">
			{$i18n.wallet_connect.text.unverifiable_approval_for_all_request}
		</MessageBox>
	{:else if nonNullish(decodedSetApprovalForAll)}
		<MessageBox
			level={decodedSetApprovalForAll.approved ? 'warning' : 'info'}
			testId="wallet-connect-approval-for-all"
		>
			{decodedSetApprovalForAll.approved
				? $i18n.wallet_connect.text.approval_for_all_grant
				: $i18n.wallet_connect.text.approval_for_all_revoke}
		</MessageBox>
	{:else if allowanceDelta}
		<MessageBox
			level={allowanceIncrease ? 'warning' : 'info'}
			testId="wallet-connect-allowance-delta"
		>
			{allowanceIncrease
				? $i18n.wallet_connect.text.allowance_increase
				: $i18n.wallet_connect.text.allowance_decrease}
		</MessageBox>
	{/if}

	<!-- Beside the notice about what the call authorizes, not instead of it. A request the review
	     refuses shows only its refusal. -->
	{#if nonNullish(unlistedToken) && !tokenCallWithValue}
		<MessageBox level="warning" testId="wallet-connect-unlisted-erc20-warning">
			{$i18n.wallet_connect.text.unlisted_erc20_request}
		</MessageBox>
	{/if}

	{#if swapToOtherAddress}
		<MessageBox level="error" testId="wallet-connect-swap-recipient">
			{$i18n.wallet_connect.text.swap_recipient_not_wallet}
		</MessageBox>
	{/if}

	{#if swapWithoutMinimum}
		<MessageBox level="error" testId="wallet-connect-swap-no-minimum">
			{$i18n.wallet_connect.text.swap_no_minimum}
		</MessageBox>
	{/if}

	{#if swapExpired}
		<MessageBox level="error" testId="wallet-connect-swap-expired">
			{$i18n.wallet_connect.text.swap_expired}
		</MessageBox>
	{/if}

	<!-- Padding an estimate is ordinary dApp behaviour and unused gas is refunded, so both tiers
	     inform instead of blocking the way undecodable ERC20 calldata does. They sit with the other
	     warnings rather than in a tab, since a warning behind a tab is one the user need not see. -->
	{#if dappGasLimit}
		<MessageBox level="info" testId="wallet-connect-dapp-gas-limit">
			{$i18n.wallet_connect.text.dapp_gas_limit}
		</MessageBox>
	{:else if highGasLimit}
		<MessageBox level="warning" testId="wallet-connect-high-gas-limit">
			{$i18n.wallet_connect.text.high_gas_limit}
		</MessageBox>
	{/if}

	<Tabs
		contentStyleClass="mt-4"
		tabs={[
			{ label: $i18n.wallet_connect.text.tab_summary, id: 'summary' },
			{ label: $i18n.wallet_connect.text.tab_raw_data, id: 'raw' }
		]}
		bind:activeTab
	>
		{#if activeTab === 'summary' && unlistedTokenLoading}
			<div class="mb-4" data-tid="wallet-connect-unlisted-erc20-loading" role="status">
				<LoaderSpinner inline size="small" />
				<span class="sr-only">{$i18n.init.info.hold_loading}</span>
			</div>
		{:else if activeTab === 'summary' && liquidiumPoolLoading}
			<div class="mb-4" data-tid="wallet-connect-liquidium-pool-loading" role="status">
				<LoaderSpinner inline size="small" />
				<span class="sr-only">{$i18n.init.info.hold_loading}</span>
			</div>
		{:else if activeTab === 'summary' && nonNullish(swap)}
			<EthWalletConnectUniswapSwap {application} network={sourceNetworkProp} {sourceNetwork} {swap}>
				{@render fee()}
			</EthWalletConnectUniswapSwap>
		{:else if activeTab === 'summary'}
			<SendData
				amount={amountDisplay}
				{application}
				{balance}
				destination={destinationDisplay}
				showAmount={!noAmount}
				showBalance={!noAmount && !unlistedBalanceUnknown}
				showNullishAmountLabel={unverifiableErc20}
				showSigner={false}
				showUnlimitedAmountLabel={erc20Approve || allowanceIncrease}
				source={$ethAddress ?? ''}
				{sourceNetwork}
				{token}
			>
				{#snippet destinationNetwork()}
					{#if nonNullish(targetNetwork)}
						<WalletConnectModalValue
							label={$i18n.send.text.destination_network}
							ref="destination-network"
						>
							<NetworkWithLogo network={targetNetwork} />
						</WalletConnectModalValue>
					{/if}
				{/snippet}

				<!-- The address is what the user can look a token up by when OISY does not list it. -->
				{#if nonNullish(unlistedToken)}
					<WalletConnectModalValue label={$i18n.tokens.text.token_address} ref="token-address">
						<span class="flex flex-wrap items-center gap-2">
							{destination}

							<AddressActions
								copyAddress={destination}
								copyAddressText={$i18n.tokens.details.token_address_copied}
								externalLink={tokenExplorerUrl}
								externalLinkAriaLabel={$i18n.tokens.alt.open_token_address_block_explorer}
								inline
							/>
						</span>
					</WalletConnectModalValue>
				{/if}

				{#if (erc20Approve || allowanceDelta) && nonNullish(spender)}
					<SendDataSpender {spender} />
				{:else if nonNullish(decodedSetApprovalForAll)}
					<SendDataSpender
						label={$i18n.wallet_connect.text.operator}
						ref="operator"
						spender={decodedSetApprovalForAll.operator}
					/>
				{:else if nonNullish(ckEthDepositPrincipal)}
					<WalletConnectModalValue
						label={$i18n.wallet_connect.text.cketh_deposit_principal}
						ref="cketh-deposit-principal"
					>
						{ckEthDepositPrincipal.toText()}
					</WalletConnectModalValue>
				{:else if nonNullish(ckDeposit)}
					<!-- The account in its standard text form: the principal alone for a default account,
					     the principal and the subaccount for any other. -->
					<WalletConnectModalValue
						label={replacePlaceholders($i18n.wallet_connect.text.ck_deposit_recipient, {
							$ckToken: ckDeposit.ckTokenSymbol
						})}
						ref="ck-deposit-account"
					>
						{nonNullish(liquidiumPool)
							? replacePlaceholders($i18n.wallet_connect.text.ck_deposit_liquidium_pool, {
									$asset: liquidiumPool.asset
								})
							: encodeIcrcAccount({ owner: ckDeposit.owner, subaccount: ckDeposit.subaccount })}
					</WalletConnectModalValue>
				{/if}

				{@render fee()}
			</SendData>
		{:else}
			<!-- What the transaction calls is the one thing the review can still state about calldata
			     it could not decode, and it is what lets the user look the call up for themselves. A
			     batch names its own wrapper and nothing else, so the calls inside it are listed too. -->
			<EthWalletConnectCallMethods {data} />

			<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
		{/if}
	</Tabs>

	{#snippet toolbar()}
		<WalletConnectActions
			approve={!flaggedAsScam}
			approveDisabled={approveDisabled ||
				(unknownCall && !unknownCallAcknowledged) ||
				tokenCallWithValue ||
				unverifiableErc20 ||
				unverifiableSetApprovalForAll ||
				ckEthDepositRefused ||
				ckEthHelperUnconfirmed ||
				ckDepositRefused ||
				liquidiumPoolLoading}
			{onApprove}
			{onReject}
		/>
	{/snippet}
</ContentWithToolbar>

<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import {
		ETH_WALLET_CONNECT_GAS_BASELINE_FLOOR,
		ETH_WALLET_CONNECT_GAS_NOTICE_MULTIPLIER,
		ETH_WALLET_CONNECT_GAS_WARNING_MULTIPLIER
	} from '$eth/constants/eth.constants';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthCall } from '$eth/types/wallet-connect';
	import { decodeErc20AbiData, decodeSetApprovalForAllData } from '$eth/utils/transactions.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectAcknowledgement from '$lib/components/wallet-connect/WalletConnectAcknowledgement.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { maxBigInt } from '$lib/utils/bigint.utils';

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
		approveDisabled?: boolean;
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
		approveDisabled = false,
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

	let unknownSelector = $derived(call.type === 'unknown' ? call.selector : undefined);

	// The user states they understand the review cannot describe this request. Nothing else gates
	// approval for an unknown call: blocking it outright would take every dApp OISY has never
	// decoded, which is most of them, offline.
	let acknowledgedUnknownCall = $state(false);

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

	let token = $derived(
		erc20
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: destination, networkId }) &&
						networkId === sourceNetworkProp.id
				)
			: $sendToken
	);

	let amountDisplay = $derived(erc20 ? decodedErc20Data?.value : amount);

	// A transfer moves tokens to the address encoded in the calldata, not to the
	// contract the transaction is addressed to.
	let destinationDisplay = $derived(erc20Transfer ? (decodedErc20Data?.to ?? null) : destination);

	// Fail closed: without both the token and its decoded calldata, the review cannot state what
	// the user would actually approve. This covers approve as well as transfer, since an
	// undecodable approve would otherwise render as a zero-amount interaction and stay approvable.
	let unverifiableErc20 = $derived(erc20 && (isNullish(decodedErc20Data) || isNullish(token)));

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
	// dropped rather than filled with a figure that describes nothing.
	let noAmount = $derived((setApprovalForAll || unknownCall) && amount === ZERO);

	let balance = $derived(nonNullish(token) ? $balancesStore?.[token.id]?.data : undefined);
</script>

<ContentWithToolbar>
	{#if unknownCall}
		<MessageBox level="error" testId="wallet-connect-unknown-call">
			{$i18n.wallet_connect.text.unknown_call}
		</MessageBox>
	{:else if unverifiableErc20}
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

	<SendData
		amount={amountDisplay}
		{application}
		{balance}
		destination={destinationDisplay}
		showAmount={!noAmount}
		showBalance={!noAmount}
		showNullishAmountLabel={unverifiableErc20}
		showUnlimitedAmountLabel={erc20Approve || allowanceIncrease}
		source={$ethAddress ?? ''}
		{token}
	>
		{#snippet sourceNetwork()}
			<WalletConnectModalValue label={$i18n.send.text.source_network} ref="source-network">
				<NetworkWithLogo network={sourceNetworkProp} />
			</WalletConnectModalValue>
		{/snippet}

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

		{#if (erc20Approve || allowanceDelta) && nonNullish(spender)}
			<SendDataSpender {spender} />
		{:else if nonNullish(decodedSetApprovalForAll)}
			<SendDataSpender
				label={$i18n.wallet_connect.text.operator}
				ref="operator"
				spender={decodedSetApprovalForAll.operator}
			/>
		{/if}

		<EthFeeDisplay gas={signedGas}>
			{#snippet label()}
				<Html text={$i18n.fee.text.max_fee_eth} />
			{/snippet}
		</EthFeeDisplay>

		<!-- Padding an estimate is ordinary dApp behaviour and unused gas is refunded, so both tiers
		     inform instead of blocking the way undecodable ERC20 calldata does. -->
		{#if dappGasLimit}
			<MessageBox level="info" testId="wallet-connect-dapp-gas-limit">
				{$i18n.wallet_connect.text.dapp_gas_limit}
			</MessageBox>
		{:else if highGasLimit}
			<MessageBox level="warning" testId="wallet-connect-high-gas-limit">
				{$i18n.wallet_connect.text.high_gas_limit}
			</MessageBox>
		{/if}

		<!-- The function a call names is the one fact the review can still state about calldata it
		     could not decode, and it is what lets the user look the call up for themselves. -->
		{#if nonNullish(unknownSelector)}
			<WalletConnectModalValue label={$i18n.wallet_connect.text.function} ref="function">
				{unknownSelector}
			</WalletConnectModalValue>
		{/if}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />
	</SendData>

	{#if unknownCall}
		<WalletConnectAcknowledgement
			inputId="eth-wallet-connect-unknown-call-agreement"
			testId="wallet-connect-unknown-call-agreement"
			text={$i18n.wallet_connect.text.unknown_call_agreement}
			bind:checked={acknowledgedUnknownCall}
		/>
	{/if}

	{#snippet toolbar()}
		<WalletConnectActions
			approveDisabled={approveDisabled ||
				unverifiableErc20 ||
				unverifiableSetApprovalForAll ||
				(unknownCall && !acknowledgedUnknownCall)}
			{onApprove}
			{onReject}
		/>
	{/snippet}
</ContentWithToolbar>

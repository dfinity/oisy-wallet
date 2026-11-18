<script lang="ts">
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import ReceiveCkBtcDepositTerms from '$icp/components/receive/ReceiveCkBtcDepositTerms.svelte';
	import ReceiveAddressQrCodeContent from '$lib/components/receive/ReceiveAddressQrCodeContent.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonQrCode from '$lib/components/ui/SkeletonQrCode.svelte';
	import {
		RECEIVE_ADDRESS_LOADING,
		RECEIVE_ADDRESS_RETRY_BUTTON,
		RECEIVE_CHANGE_TOKEN_BUTTON,
		RECEIVE_CKBTC_DEPOSIT_WARNING,
		RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON,
		RECEIVE_ENABLE_TOKEN_BUTTON,
		RECEIVE_HOW_TO_CONVERT_BUTTON,
		RECEIVE_ICP_FORMAT_ACCOUNT_ID,
		RECEIVE_ICP_FORMAT_PRINCIPAL,
		RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON,
		RECEIVE_TOKENS_MODAL_DONE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type {
		ReceiveAddressState,
		ReceiveIcpAddressFormat,
		ReceiveRoute
	} from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkEthereum } from '$lib/utils/network.utils';
	import { isReceiveTestToken } from '$lib/utils/receive.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		route: ReceiveRoute;
		addressState: ReceiveAddressState;
		icpFormat: ReceiveIcpAddressFormat;
		tokenEnabled: boolean;
		enabling: boolean;
		enableFailed: boolean;
		// The previous step was a visible choice: the route picker or the token picker.
		backToPreviousStep: boolean;
		convertTwinToken?: Token;
		onEnable: () => void;
		onRetryAddress: () => void;
		onBack: () => void;
		onChangeToken: () => void;
		onDone: () => void;
		onHowToConvert: () => void;
		onViewActivity: () => void;
	}

	let {
		route,
		addressState,
		icpFormat = $bindable(),
		tokenEnabled,
		enabling,
		enableFailed,
		backToPreviousStep,
		convertTwinToken,
		onEnable,
		onRetryAddress,
		onBack,
		onChangeToken,
		onDone,
		onHowToConvert,
		onViewActivity
	}: Props = $props();

	let { kind, addressKind, sourceToken, sourceNetwork, creditedToken } = $derived(route);

	let deposit = $derived(kind === 'ckbtc-deposit');

	let sourceSymbol = $derived(getTokenDisplaySymbol(sourceToken));

	let creditedSymbol = $derived(getTokenDisplaySymbol(creditedToken));

	let addressLabel = $derived(
		deposit
			? $i18n.receive.ckbtc.text.deposit_address
			: addressKind === 'icp'
				? icpFormat === 'account-id'
					? $i18n.receive.token.text.account_id_label
					: $i18n.receive.token.text.principal_label
				: replacePlaceholders($i18n.receive.token.text.address_label, {
						$network: sourceNetwork.name
					})
	);

	let copyAriaLabel = $derived(
		deposit
			? $i18n.receive.ckbtc.text.deposit_address_copied
			: addressKind === 'icp'
				? icpFormat === 'account-id'
					? $i18n.receive.icp.text.account_id_copied
					: $i18n.receive.icp.text.internet_computer_principal_copied
				: replacePlaceholders($i18n.receive.token.text.address_copied, {
						$network: sourceNetwork.name
					})
	);

	let metamaskNetwork = $derived(
		isTokenEthereumNative(sourceToken) && isNetworkEthereum(sourceNetwork)
			? sourceNetwork
			: undefined
	);
</script>

<ContentWithToolbar>
	<div class="mb-4 flex flex-col gap-1">
		{#if deposit}
			<ModalValue>
				{#snippet label()}{$i18n.receive.ckbtc.text.you_send}{/snippet}
				{#snippet mainValue()}
					{replacePlaceholders($i18n.receive.ckbtc.text.on_network, {
						$token: sourceSymbol,
						$network: sourceNetwork.name
					})}
				{/snippet}
			</ModalValue>
			<ModalValue>
				{#snippet label()}{$i18n.receive.ckbtc.text.you_receive}{/snippet}
				{#snippet mainValue()}
					{replacePlaceholders($i18n.receive.ckbtc.text.on_network, {
						$token: creditedSymbol,
						$network: creditedToken.network.name
					})}
				{/snippet}
			</ModalValue>
		{:else}
			<ModalValue>
				{#snippet label()}{$i18n.receive.token.text.asset}{/snippet}
				{#snippet mainValue()}{sourceSymbol}{/snippet}
			</ModalValue>
			<ModalValue>
				{#snippet label()}{$i18n.receive.token.text.network}{/snippet}
				{#snippet mainValue()}
					<span class="inline-flex items-center gap-2">
						{sourceNetwork.name}
						{#if isReceiveTestToken(creditedToken)}
							<Badge variant="warning" width="w-fit">
								{$i18n.receive.token.text.test_network}
							</Badge>
						{/if}
					</span>
				{/snippet}
			</ModalValue>
		{/if}
	</div>

	{#if addressKind === 'icp'}
		<div class="mb-4 flex gap-2" aria-label={$i18n.receive.token.text.address_format} role="group">
			<Button
				colorStyle={icpFormat === 'principal' ? 'primary' : 'secondary-light'}
				fullWidth
				onclick={() => (icpFormat = 'principal')}
				paddingSmall
				pressed={icpFormat === 'principal'}
				testId={RECEIVE_ICP_FORMAT_PRINCIPAL}
			>
				{$i18n.receive.token.text.principal}
			</Button>
			<Button
				colorStyle={icpFormat === 'account-id' ? 'primary' : 'secondary-light'}
				fullWidth
				onclick={() => (icpFormat = 'account-id')}
				paddingSmall
				pressed={icpFormat === 'account-id'}
				testId={RECEIVE_ICP_FORMAT_ACCOUNT_ID}
			>
				{$i18n.receive.token.text.account_id}
			</Button>
		</div>
		<p class="mb-4 text-sm text-tertiary">{$i18n.receive.token.text.icp_format_hint}</p>
	{/if}

	{#if !tokenEnabled}
		<p class="mb-4 text-primary">
			{replacePlaceholders($i18n.receive.token.text.enable_info, { $token: creditedSymbol })}
		</p>

		{#if enableFailed}
			<p class="mb-4 text-error-primary" role="alert">
				{replacePlaceholders($i18n.receive.token.text.enable_error, { $token: creditedSymbol })}
			</p>
		{/if}

		<Button
			colorStyle="primary"
			disabled={enabling}
			fullWidth
			loading={enabling}
			onclick={onEnable}
			testId={RECEIVE_ENABLE_TOKEN_BUTTON}
		>
			{enabling ? $i18n.receive.token.text.enabling : $i18n.receive.token.text.enable_and_show}
		</Button>
	{:else}
		{#if deposit}
			<MessageBox level="warning" styleClass="mb-4" testId={RECEIVE_CKBTC_DEPOSIT_WARNING}>
				{$i18n.receive.ckbtc.text.deposit_warning}
			</MessageBox>
		{:else}
			<p class="mb-4 text-sm text-tertiary">
				{replacePlaceholders($i18n.receive.token.text.send_instruction, {
					$token: sourceSymbol,
					$network: sourceNetwork.name
				})}
			</p>
		{/if}

		<div aria-live="polite">
			{#if addressState.status === 'ready'}
				{#key addressState.address}
					<ReceiveAddressQrCodeContent
						address={addressState.address}
						{addressLabel}
						addressToken={sourceToken}
						{copyAriaLabel}
						copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON}
						network={sourceNetwork}
					/>
				{/key}
			{:else if addressState.status === 'error'}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<p class="text-error-primary" role="alert">{$i18n.receive.token.text.address_error}</p>
					<Button
						colorStyle="secondary-light"
						onclick={onRetryAddress}
						paddingSmall
						testId={RECEIVE_ADDRESS_RETRY_BUTTON}
					>
						{$i18n.core.text.retry}
					</Button>
				</div>
			{:else}
				<div data-tid={RECEIVE_ADDRESS_LOADING}>
					<span class="sr-only">{$i18n.receive.token.text.address_loading}</span>
					<SkeletonQrCode />
				</div>
			{/if}
		</div>

		{#if deposit}
			<ReceiveCkBtcDepositTerms {sourceToken} token={creditedToken} />

			{#if addressState.status === 'ready'}
				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={onViewActivity}
					styleClass="mt-4"
					testId={RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON}
				>
					{$i18n.receive.ckbtc.text.view_activity}
				</Button>
			{/if}
		{/if}

		{#if addressState.status === 'ready' && metamaskNetwork}
			<EthReceiveMetamask address={addressState.address} network={metamaskNetwork} />
		{/if}
	{/if}

	{#if convertTwinToken}
		<div class="mt-6">
			<p class="mb-2 text-sm text-tertiary">
				{replacePlaceholders($i18n.receive.token.text.how_to_convert_description, {
					$token: getTokenDisplaySymbol(convertTwinToken),
					$network: convertTwinToken.network.name,
					$ckToken: creditedSymbol
				})}
			</p>
			<Button
				colorStyle="secondary"
				fullWidth
				onclick={onHowToConvert}
				paddingSmall
				testId={RECEIVE_HOW_TO_CONVERT_BUTTON}
			>
				{replacePlaceholders($i18n.receive.token.text.how_to_convert, {
					$token: getTokenDisplaySymbol(convertTwinToken),
					$ckToken: creditedSymbol
				})}
			</Button>
		</div>
	{/if}

	{#snippet toolbar()}
		<div class="flex w-full gap-3">
			{#if backToPreviousStep}
				<ButtonBack fullWidth onclick={onBack} />
			{:else}
				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={onChangeToken}
					testId={RECEIVE_CHANGE_TOKEN_BUTTON}
				>
					{$i18n.receive.token.text.change_token}
				</Button>
			{/if}
			<ButtonDone onclick={onDone} testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON} />
		</div>
	{/snippet}
</ContentWithToolbar>

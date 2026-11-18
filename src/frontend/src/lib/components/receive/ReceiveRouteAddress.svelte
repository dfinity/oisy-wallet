<script lang="ts">
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import ReceiveCkBtcDepositTerms from '$icp/components/receive/ReceiveCkBtcDepositTerms.svelte';
	import ReceiveAddressQrCodeContent from '$lib/components/receive/ReceiveAddressQrCodeContent.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
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
		retrying: boolean;
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
		retrying,
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

	// The button is named for what it does; the confirmation says what happened.
	let copyAriaLabel = $derived(
		deposit
			? $i18n.receive.ckbtc.text.copy_deposit_address
			: addressKind === 'icp'
				? icpFormat === 'account-id'
					? $i18n.receive.token.text.copy_account_id
					: $i18n.receive.token.text.copy_principal
				: replacePlaceholders($i18n.receive.token.text.copy_address, {
						$network: sourceNetwork.name
					})
	);

	let copiedText = $derived(
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

	const icpFormats: { format: ReceiveIcpAddressFormat; label: string; testId: string }[] = $derived(
		[
			{
				format: 'principal',
				label: $i18n.receive.token.text.principal,
				testId: RECEIVE_ICP_FORMAT_PRINCIPAL
			},
			{
				format: 'account-id',
				label: $i18n.receive.token.text.account_id,
				testId: RECEIVE_ICP_FORMAT_ACCOUNT_ID
			}
		]
	);

	let metamaskNetwork = $derived(
		isTokenEthereumNative(sourceToken) && isNetworkEthereum(sourceNetwork)
			? sourceNetwork
			: undefined
	);
</script>

<ContentWithToolbar>
	<!-- What the sender sends, and on which network: one line, the anchor of the step. -->
	<div class="mb-4 flex items-center gap-3">
		<TokenLogo badge={{ type: 'network' }} color="white" data={sourceToken} logoSize="md" />

		<div class="flex min-w-0 flex-1 flex-col">
			<span
				class="block text-base leading-tight font-bold text-primary outline-none"
				data-receive-focus
				tabindex="-1"
			>
				{replacePlaceholders($i18n.receive.token.text.token_on_network, {
					$token: sourceSymbol,
					$network: sourceNetwork.name
				})}
			</span>

			{#if deposit}
				<span class="mt-0.5 block text-sm leading-tight text-tertiary">
					{replacePlaceholders($i18n.receive.ckbtc.text.arrives_as, {
						$token: creditedSymbol,
						$network: creditedToken.network.name
					})}
				</span>
			{/if}
		</div>

		{#if isReceiveTestToken(creditedToken)}
			<Badge variant="warning" width="w-fit">
				{$i18n.receive.token.text.test_network}
			</Badge>
		{/if}
	</div>

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
			{enabling
				? $i18n.receive.token.text.enabling
				: replacePlaceholders($i18n.receive.token.text.enable_and_show, {
						$token: creditedSymbol
					})}
		</Button>
	{:else}
		{#if addressKind === 'icp'}
			<div class="mb-4">
				<div
					class="flex rounded-full bg-brand-subtle-10 p-1"
					aria-label={$i18n.receive.token.text.address_format}
					role="radiogroup"
				>
					{#each icpFormats as { format, label, testId } (format)}
						<button
							class="flex flex-1 items-center justify-center rounded-full border-0 px-3 py-1.5 text-center text-sm font-semibold transition-colors duration-150 ease-out"
							class:bg-primary={icpFormat === format}
							class:shadow-sm={icpFormat === format}
							class:text-primary={icpFormat === format}
							class:text-tertiary={icpFormat !== format}
							aria-checked={icpFormat === format}
							data-tid={testId}
							onclick={() => (icpFormat = format)}
							role="radio"
							type="button"
						>
							{label}
						</button>
					{/each}
				</div>

				<p class="mt-2 text-sm text-tertiary">{$i18n.receive.token.text.icp_format_hint}</p>
			</div>
		{/if}

		<div aria-live="polite">
			{#if addressState.status === 'ready'}
				{#key addressState.address}
					<ReceiveAddressQrCodeContent
						address={addressState.address}
						{addressLabel}
						addressToken={sourceToken}
						{copiedText}
						{copyAriaLabel}
						copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON}
						network={sourceNetwork}
					>
						{#snippet text()}
							<!-- Right above the address and Copy, so it is in view wherever the address is. -->
							{#if deposit}
								<span data-tid={RECEIVE_CKBTC_DEPOSIT_WARNING}>
									<strong class="text-warning-primary"
										>{$i18n.receive.ckbtc.text.deposit_warning}</strong
									>
									{$i18n.receive.ckbtc.text.deposit_explanation}
								</span>
							{:else}
								{replacePlaceholders($i18n.receive.token.text.send_instruction, {
									$token: sourceSymbol,
									$network: sourceNetwork.name
								})}
							{/if}
						{/snippet}
					</ReceiveAddressQrCodeContent>
				{/key}
			{:else if addressState.status === 'error'}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<p class="text-error-primary" role="alert">{$i18n.receive.token.text.address_error}</p>
					<Button
						colorStyle="secondary-light"
						disabled={retrying}
						loading={retrying}
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
			<!-- Without an address there is nothing to be done with: enabling stays the one primary action. -->
			<ButtonDone
				onclick={onDone}
				testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON}
				variant={tokenEnabled ? 'primary' : 'secondary-light'}
			/>
		</div>
	{/snippet}
</ContentWithToolbar>

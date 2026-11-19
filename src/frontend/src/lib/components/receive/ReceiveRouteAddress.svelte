<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount, tick } from 'svelte';
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import ReceiveCkBtcDepositTerms from '$icp/components/receive/ReceiveCkBtcDepositTerms.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ReceiveAddressField from '$lib/components/receive/ReceiveAddressField.svelte';
	import ReceiveBackButton from '$lib/components/receive/ReceiveBackButton.svelte';
	import ReceiveEnableToken from '$lib/components/receive/ReceiveEnableToken.svelte';
	import ReceiveQrCode from '$lib/components/receive/ReceiveQrCode.svelte';
	import ReceiveTestNetworkBadge from '$lib/components/receive/ReceiveTestNetworkBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import {
		RECEIVE_ADDRESS_LOADING,
		RECEIVE_ADDRESS_RETRY_BUTTON,
		RECEIVE_CKBTC_DEPOSIT_WARNING,
		RECEIVE_HOW_TO_CONVERT_BUTTON,
		RECEIVE_ICP_FORMAT_ACCOUNT_ID,
		RECEIVE_ICP_FORMAT_PRINCIPAL,
		RECEIVE_TOKENS_MODAL_ADDRESS_LABEL,
		RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON,
		RECEIVE_TOKENS_MODAL_DONE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { receiveAddressSources } from '$lib/derived/receive.derived';
	import { retryReceiveAddress } from '$lib/services/receive.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ReceiveIcpAddressFormat, ReceiveRoute } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkEthereum, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import {
		getReceiveAddressTexts,
		getReceiveConvertTwinToken,
		isReceiveTestToken,
		RECEIVE_ADDRESS_LOADING_STATE,
		resolveReceiveAddress
	} from '$lib/utils/receive.utils';
	import { isTokenEnabled } from '$lib/utils/token-toggleable.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		route: ReceiveRoute;
		// The previous step was a visible choice: the route picker or the token picker.
		backToPreviousStep: boolean;
		onBack: () => void;
		onChangeToken: () => void;
		onDone: () => void;
		onHowToConvert: (twinToken: Token) => void;
		onViewActivity: () => void;
	}

	let {
		route,
		backToPreviousStep,
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

	let icpFormat = $state<ReceiveIcpAddressFormat>('principal');

	let tokenEnabled = $derived(isTokenEnabled(creditedToken));

	let addressState = $derived(
		tokenEnabled
			? resolveReceiveAddress({ route, icpFormat, sources: $receiveAddressSources })
			: RECEIVE_ADDRESS_LOADING_STATE
	);

	let { label, copyAriaLabel, copiedText } = $derived(
		getReceiveAddressTexts({ route, icpFormat, i18n: $i18n })
	);

	const icpFormats: { value: ReceiveIcpAddressFormat; label: string; testId: string }[] = $derived([
		{
			value: 'principal',
			label: $i18n.receive.token.text.principal,
			testId: RECEIVE_ICP_FORMAT_PRINCIPAL
		},
		{
			value: 'account-id',
			label: $i18n.receive.token.text.account_id,
			testId: RECEIVE_ICP_FORMAT_ACCOUNT_ID
		}
	]);

	let metamaskNetwork = $derived(
		// MetaMask's network switch takes Ethereum and Sepolia, not the other EVM networks.
		isTokenEthereumNative(sourceToken) &&
			isNetworkEthereum(sourceNetwork) &&
			isNetworkIdEthereum(sourceNetwork.id)
			? sourceNetwork
			: undefined
	);

	// Offered once the ck token is enabled: its page, where the instructions open, lists only enabled
	// tokens.
	let convertTwinToken = $derived(
		kind === 'direct' && tokenEnabled
			? getReceiveConvertTwinToken({
					token: creditedToken,
					enabledNetworkIds: $networks.map(({ id }) => id)
				})
			: undefined
	);

	const howToConvert = () => {
		if (nonNullish(convertTwinToken)) {
			onHowToConvert(convertTwinToken);
		}
	};

	let retrying = $state(false);

	const retry = async () => {
		retrying = true;

		try {
			await retryReceiveAddress({ route, identity: $authIdentity });
		} finally {
			retrying = false;
		}
	};

	// The modal title names what to send and where; the step itself takes focus, so keyboard and
	// screen-reader users land in it.
	let content = $state<HTMLDivElement | undefined>();

	onMount(async () => {
		await tick();
		content?.focus({ preventScroll: true });
	});
</script>

<ContentWithToolbar>
	<div bind:this={content} class="outline-none" tabindex="-1">
		{#if isReceiveTestToken(creditedToken)}
			<div class="mb-4">
				<ReceiveTestNetworkBadge />
			</div>
		{/if}

		{#if !tokenEnabled}
			<ReceiveEnableToken {route} />
		{:else}
			{#if addressKind === 'icp'}
				<div class="mb-4">
					<SegmentedControl
						ariaLabel={$i18n.receive.token.text.address_format}
						options={icpFormats}
						bind:value={icpFormat}
					/>
				</div>
			{/if}

			<div aria-live="polite">
				{#if addressState.status === 'ready'}
					{#key addressState.address}
						<ReceiveQrCode
							address={addressState.address}
							addressToken={sourceToken}
							size="compact"
						/>

						<ReceiveAddressField
							address={addressState.address}
							{copiedText}
							{copyAriaLabel}
							copyButtonTestId={RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON}
							{label}
							testId={RECEIVE_TOKENS_MODAL_ADDRESS_LABEL}
						/>

						<!-- Right under the address and Copy, so it is in view wherever the address is copied. -->
						{#if deposit}
							<!-- The icon carries the warning colour; the sentence stays at the text colour, which
							     the orange cannot reach on white at this size (WCAG AA). -->
							<div
								class="mt-3 flex items-start gap-2 px-4 text-sm leading-5 font-bold text-primary"
								data-tid={RECEIVE_CKBTC_DEPOSIT_WARNING}
							>
								<span class="flex h-5 shrink-0 items-center text-warning-primary"
									><IconWarning /></span
								>
								<span>{$i18n.receive.ckbtc.text.deposit_warning}</span>
							</div>
						{:else}
							<div class="mt-3 flex items-start gap-2 px-4 text-sm leading-5 text-tertiary">
								<span class="flex h-5 shrink-0 items-center"><IconInfo /></span>
								<span>
									{replacePlaceholders($i18n.receive.token.text.send_instruction, {
										$token: sourceSymbol,
										$network: sourceNetwork.name
									})}
								</span>
							</div>
						{/if}
					{/key}
				{:else if addressState.status === 'error'}
					<div class="flex flex-col items-center gap-3 py-6 text-center">
						<p class="text-error-primary" role="alert">{$i18n.receive.token.text.address_error}</p>
						<Button
							colorStyle="secondary-light"
							disabled={retrying}
							loading={retrying}
							onclick={retry}
							paddingSmall
							testId={RECEIVE_ADDRESS_RETRY_BUTTON}
						>
							{$i18n.core.text.retry}
						</Button>
					</div>
				{:else}
					<div data-tid={RECEIVE_ADDRESS_LOADING}>
						<span class="sr-only">{$i18n.receive.token.text.address_loading}</span>
						<div
							class="mx-auto mb-4 aspect-square h-56 max-h-[36vh] animate-pulse rounded-xl bg-disabled-alt"
						></div>
					</div>
				{/if}
			</div>

			{#if deposit}
				<ReceiveCkBtcDepositTerms
					onViewActivity={addressState.status === 'ready' ? onViewActivity : undefined}
					{sourceToken}
					token={creditedToken}
				/>
			{/if}

			{#if addressState.status === 'ready' && metamaskNetwork}
				<EthReceiveMetamask address={addressState.address} network={metamaskNetwork} />
			{/if}
		{/if}

		{#if nonNullish(convertTwinToken)}
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
					onclick={howToConvert}
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
	</div>

	{#snippet toolbar()}
		<div class="flex w-full gap-3">
			<ReceiveBackButton
				back={backToPreviousStep}
				onclick={backToPreviousStep ? onBack : onChangeToken}
			/>
			<!-- Without an address there is nothing to be done with: enabling stays the one primary action. -->
			<ButtonDone
				onclick={onDone}
				testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON}
				variant={tokenEnabled ? 'primary' : 'secondary-light'}
			/>
		</div>
	{/snippet}
</ContentWithToolbar>

<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Network } from '$lib/types/network';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { XRP_BASE_RESERVE_DROPS, XRP_OWNER_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
	import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
	import {
		loadXrpAddTokenReview,
		type XrpAddTokenRefusal,
		type XrpAddTokenReview
	} from '$xrp/services/xrp-add-token.services';
	import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
	import type { XrpBalance } from '$xrp/types/xrp-balance';
	import type { XrpIssuerPower } from '$xrp/types/xrp-trust-line-token';

	interface Props {
		network: Network;
		currency?: string;
		issuer?: string;
		onBack: () => void;
	}

	let { network, currency, issuer, onBack }: Props = $props();

	let review = $state<XrpAddTokenReview | undefined>();

	const formatXrp = (value: XrpBalance): string =>
		formatToken({ value, unitName: XRP_TOKEN.decimals });

	const refusalMessage = ({
		refusal,
		reserve
	}: {
		refusal: XrpAddTokenRefusal;
		reserve?: XrpBalance;
	}): string => {
		switch (refusal) {
			case 'invalid_currency_code':
				return $i18n.tokens.import.error.xrp_invalid_currency_code;
			case 'invalid_issuer':
				return $i18n.tokens.import.error.xrp_invalid_issuer;
			case 'issuer_is_own_address':
				return $i18n.tokens.import.error.xrp_issuer_is_own_address;
			case 'already_added':
				return $i18n.tokens.error.already_available;
			case 'issuer_not_found':
				return $i18n.tokens.import.error.xrp_issuer_not_found;
			case 'issuer_disallows_trust_lines':
				return $i18n.tokens.import.error.xrp_issuer_disallows_trust_lines;
			case 'account_not_found':
				return replacePlaceholders($i18n.tokens.import.error.xrp_account_not_found, {
					$amount: formatXrp(XRP_BASE_RESERVE_DROPS)
				});
			case 'insufficient_fee':
				return $i18n.tokens.import.error.xrp_insufficient_fee;
			case 'insufficient_reserve':
				return replacePlaceholders($i18n.tokens.import.error.xrp_insufficient_reserve, {
					$amount: nonNullish(reserve) ? formatXrp(reserve) : ''
				});
			case 'state_unavailable':
				return $i18n.tokens.import.error.xrp_state_unavailable;
		}
	};

	onMount(async () => {
		const nativeToken = $enabledXrpTokens.find(({ network: { id } }) => id === network.id);

		const result = await loadXrpAddTokenReview({
			currency: currency ?? '',
			issuer: issuer ?? '',
			address: $xrpAddressMainnet,
			lines: nonNullish(nativeToken) ? $xrpTrustLinesStore[nativeToken.id] : undefined,
			network
		});

		const { refusal, reserve, review: loaded } = result;

		if (nonNullish(refusal)) {
			toastsError({ msg: { text: refusalMessage({ refusal, reserve }) } });

			onBack();
			return;
		}

		review = loaded;
	});

	const powerText = (power: XrpIssuerPower): string =>
		power.type === 'transfer_fee'
			? replacePlaceholders($i18n.tokens.import.xrp_issuer_power.transfer_fee, {
					$fee: new Intl.NumberFormat($currentLanguage, { maximumFractionDigits: 7 }).format(
						power.percent
					)
				})
			: $i18n.tokens.import.xrp_issuer_power[power.type];

	let lookalike = $derived(review?.lookalike);

	let powers = $derived(review?.powers ?? []);

	let issuerUrl = $derived(
		nonNullish(review) && nonNullish(network.explorerUrl)
			? `${network.explorerUrl}/account/${review.token.issuer}`
			: undefined
	);
</script>

<ContentWithToolbar>
	<Value element="div" ref="xrpTokenSymbol">
		{#snippet label()}
			{$i18n.core.text.symbol}
		{/snippet}

		{#snippet content()}
			{#if isNullish(review)}
				&#8203;
			{:else}
				<span in:fade>{review.token.symbol}</span>
			{/if}
		{/snippet}
	</Value>

	<Value element="div" ref="xrpTokenIssuer">
		{#snippet label()}
			{$i18n.tokens.import.text.xrp_issued_by}
		{/snippet}

		{#snippet content()}
			{#if isNullish(review)}
				&#8203;
			{:else}
				<span class="break-all" in:fade>
					{#if nonNullish(issuerUrl)}
						<ExternalLink
							ariaLabel={$i18n.navigation.text.view_on_explorer}
							href={issuerUrl}
							iconVisible
							inline>{review.token.issuer}</ExternalLink
						>
					{:else}
						{review.token.issuer}
					{/if}
				</span>
			{/if}
		{/snippet}
	</Value>

	<Value element="div" ref="network">
		{#snippet label()}
			{$i18n.tokens.manage.text.network}
		{/snippet}

		{#snippet content()}
			<NetworkWithLogo {network} />
		{/snippet}
	</Value>

	{#if powers.length > 0}
		<Value element="div" ref="xrpIssuerPowers">
			{#snippet label()}
				{$i18n.tokens.import.text.xrp_issuer_powers}
			{/snippet}

			{#snippet content()}
				<ul class="list-disc pl-5" in:fade>
					{#each powers as power (power.type)}
						<li>{powerText(power)}</li>
					{/each}
				</ul>
			{/snippet}
		</Value>
	{/if}

	{#if nonNullish(review)}
		<div class="mb-4" in:fade>
			<FeeDisplay
				decimals={XRP_TOKEN.decimals}
				exchangeRate={$exchanges?.[XRP_TOKEN.id]?.usd}
				feeAmount={review.fee}
				symbol={XRP_TOKEN.symbol}
			>
				{#snippet label()}
					<span>{$i18n.fee.text.network_fee}</span>
				{/snippet}
			</FeeDisplay>

			<p class="mt-2 text-sm">
				{replacePlaceholders($i18n.tokens.import.text.xrp_reserve, {
					$amount: formatXrp(XRP_OWNER_RESERVE_DROPS)
				})}
			</p>

			<p class="text-sm">
				{replacePlaceholders($i18n.tokens.import.text.xrp_reserve_after, {
					$amount: formatXrp(review.reserveAfter)
				})}
			</p>
		</div>
	{/if}

	{#if nonNullish(lookalike)}
		<div class="mb-4">
			<MessageBox level="warning">
				{replacePlaceholders(
					replaceOisyPlaceholders($i18n.tokens.import.warning.xrp_not_listed_token),
					{
						$symbol: lookalike.symbol,
						$issuer: shortenWithMiddleEllipsis({ text: lookalike.issuer, splitLength: 5 })
					}
				)}
			</MessageBox>
		</div>
	{/if}

	<AddTokenWarning />

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={() => onBack()} />
			<!-- Adding sends a `TrustSet`, which is signed through the XRP in-flight guard: until the
			     guard's frontend is on main the review stops here (spec §7.4, PR 3b). -->
			<Button disabled>
				{$i18n.tokens.import.text.add_the_token}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

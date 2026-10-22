<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import SettingsWalletConnectUncheckedSigningConfirm from '$lib/components/settings/SettingsWalletConnectUncheckedSigningConfirm.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { OISY_WALLET_CONNECT_UNCHECKED_SIGNING_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		SETTINGS_UNCHECKED_SIGNING_TIME_LEFT,
		SETTINGS_UNCHECKED_SIGNING_TOGGLE
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { trackWalletConnectUncheckedSigning } from '$lib/services/wallet-connect-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { walletConnectUncheckedSigningStore } from '$lib/stores/wallet-connect-unchecked-signing.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isWalletConnectUncheckedSigningActive } from '$lib/utils/wallet-connect.utils';

	let now = $state(Date.now());

	// While the confirmation is open the switch shows on, matching the box the user just moved, and
	// it goes back to off if they cancel. Left to the input alone, a cancelled confirmation would
	// leave it drawn on while nothing is.
	let confirming = $state(false);

	// A new confirmation every time, so the box is never found ticked: reopened while the last one is
	// still fading out, the same one would come back as it was left.
	let confirmations = $state(0);

	let active = $derived(
		isWalletConnectUncheckedSigningActive({ expiresAt: $walletConnectUncheckedSigningStore, now })
	);

	let secondsLeft = $derived(
		active && nonNullish($walletConnectUncheckedSigningStore)
			? Math.ceil(($walletConnectUncheckedSigningStore - now) / 1_000)
			: undefined
	);

	// Whole minutes, rounded up, so the switch reads 5 minutes as it is turned on rather than 4 a second
	// later, and seconds only in its last minute.
	let durationLeft = $derived(
		nonNullish(secondsLeft)
			? secondsLeft > 60
				? Math.ceil(secondsLeft / 60) * 60
				: Math.max(secondsLeft, 0)
			: undefined
	);

	// Only a switch that is on has time left to show, so only then does it need a clock.
	$effect(() => {
		if (!active) {
			return;
		}

		const interval = setInterval(() => (now = Date.now()), 1_000);

		return () => clearInterval(interval);
	});

	const onToggle = (checked: boolean) => {
		if (checked) {
			confirmations++;
			confirming = true;
			return;
		}

		walletConnectUncheckedSigningStore.disable();
	};

	const onConfirm = () => {
		walletConnectUncheckedSigningStore.enable();

		// Read after enabling, so the clock is never behind the moment the switch was turned on.
		now = Date.now();

		confirming = false;

		trackWalletConnectUncheckedSigning({ modifier: 'enable' });
	};

	const onCancel = () => (confirming = false);
</script>

<SettingsCardItem>
	{#snippet key()}
		{$i18n.settings.text.allow_unchecked_signing}
	{/snippet}

	{#snippet value()}
		<span class="flex items-center gap-2">
			{#if nonNullish(durationLeft)}
				<span
					class="text-sm whitespace-nowrap text-tertiary"
					data-tid={SETTINGS_UNCHECKED_SIGNING_TIME_LEFT}
				>
					{replacePlaceholders($i18n.settings.text.unchecked_signing_time_left, {
						$duration: secondsToDuration({
							seconds: BigInt(durationLeft),
							i18n: $i18n.temporal.seconds_to_duration
						})
					})}
				</span>
			{/if}

			<Toggle
				ariaLabel={active
					? $i18n.settings.text.disable_unchecked_signing
					: $i18n.settings.text.enable_unchecked_signing}
				checked={active || confirming}
				{onToggle}
				testId={SETTINGS_UNCHECKED_SIGNING_TOGGLE}
			/>
		</span>
	{/snippet}

	{#snippet info()}
		<span>
			{$i18n.settings.text.allow_unchecked_signing_description}

			<ExternalLink
				ariaLabel={$i18n.settings.text.learn_more}
				href={OISY_WALLET_CONNECT_UNCHECKED_SIGNING_DOCS_URL}
				iconVisible={false}
				trackEvent={buildLearnMoreEvent({
					sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
					sourceSublocation: 'wallet_connect_unchecked_signing',
					labelKey: 'settings.text.learn_more',
					url: OISY_WALLET_CONNECT_UNCHECKED_SIGNING_DOCS_URL
				})}>{$i18n.settings.text.learn_more}</ExternalLink
			>
		</span>
	{/snippet}
</SettingsCardItem>

{#if confirming}
	{#key confirmations}
		<SettingsWalletConnectUncheckedSigningConfirm {onCancel} {onConfirm} />
	{/key}
{/if}

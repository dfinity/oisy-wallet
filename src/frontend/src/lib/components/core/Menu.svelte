<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { TIPS_ENABLED } from '$env/tips.env';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import LockOrSignOut from '$lib/components/core/LockOrSignOut.svelte';
	import MenuAddresses from '$lib/components/core/MenuAddresses.svelte';
	import MenuLanguageSelector from '$lib/components/core/MenuLanguageSelector.svelte';
	import MenuThemeSelector from '$lib/components/core/MenuThemeSelector.svelte';
	import IconBinance from '$lib/components/icons/IconBinance.svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import IconHelpCircle from '$lib/components/icons/IconHelpCircle.svelte';
	import IconPay from '$lib/components/icons/IconPay.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import IconUser from '$lib/components/icons/IconUser.svelte';
	import IconVipQr from '$lib/components/icons/IconVipQr.svelte';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import IconlySettings from '$lib/components/icons/iconly/IconlySettings.svelte';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconMaximize from '$lib/components/icons/lucide/IconMaximize.svelte';
	import IconShare from '$lib/components/icons/lucide/IconShare.svelte';
	import IconUsersRound from '$lib/components/icons/lucide/IconUsersRound.svelte';
	import LicenseAgreementLink from '$lib/components/license-agreement/LicenseAgreementLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import SupportLink from '$lib/components/navigation/SupportLink.svelte';
	import PrivacyPolicyLink from '$lib/components/privacy-policy/PrivacyPolicyLink.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import { USER_MENU_ROUTE } from '$lib/constants/analytics.constants';
	import { OISY_SUPPORT_URL } from '$lib/constants/oisy.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		NAVIGATION_MENU_BUTTON,
		NAVIGATION_MENU,
		NAVIGATION_MENU_VIP_BUTTON,
		NAVIGATION_MENU_REFERRAL_BUTTON,
		NAVIGATION_MENU_TIP_BADGE,
		NAVIGATION_MENU_TIP_BUTTON,
		NAVIGATION_MENU_TIP_COUNT,
		NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
		NAVIGATION_MENU_GOLD_BUTTON,
		NAVIGATION_MENU_SCANNER_BUTTON,
		NAVIGATION_MENU_PAY_BUTTON,
		NAVIGATION_MENU_PRIVACY_MODE_BUTTON,
		NAVIGATION_MENU_SETTINGS_BUTTON,
		NAVIGATION_MENU_SUPPORT_BUTTON,
		NAVIGATION_MENU_DOC_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { BACKDROP_FADE_OUT_DURATION } from '$lib/constants/transition.constants';
	import { authIdentity, authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { tipsOverview } from '$lib/derived/tips.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { getUserRoles } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import {
		isRouteActivity,
		isRouteRewards,
		isRouteDappExplorer,
		isRouteSettings,
		networkUrl
	} from '$lib/utils/nav.utils';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';
	import { waitForMilliseconds } from '$lib/utils/timeout.utils';

	interface Props {
		visible?: boolean;
	}

	let { visible = $bindable(false) }: Props = $props();

	let button = $state<HTMLButtonElement | undefined>();

	let isVip = $state(false);
	let isGold = $state(false);

	onMount(async () => {
		if (nonNullish($authIdentity)) {
			({ isVip, isGold } = await getUserRoles({ identity: $authIdentity }));
		}
	});

	const hidePopover = () => (visible = false);

	const handlePrivacyToggle = () => {
		setPrivacyMode({ enabled: !$isPrivacyMode, withToast: false, source: 'User menu click' });
	};

	const goToSettings = async () => {
		hidePopover();
		// Wait for the popover's backdrop to finish fading out before navigating.
		// Otherwise the blurred backdrop lingers over the freshly-rendered Settings
		// page and reads as a flicker — unlike the other menu entries, which open a
		// covering modal and never change the route.
		await waitForMilliseconds(BACKDROP_FADE_OUT_DURATION);
		await goto(
			networkUrl({
				path: AppPath.Settings,
				networkId: $userSelectedNetworkStore,
				usePreviousRoute: false,
				fromRoute: null
			})
		);
	};

	const settingsRoute = $derived(isRouteSettings(page));
	const dAppExplorerRoute = $derived(isRouteDappExplorer(page));
	const activityRoute = $derived(isRouteActivity(page));
	const rewardsRoute = $derived(isRouteRewards(page));
	const addressesOption = $derived(
		!settingsRoute && !dAppExplorerRoute && !activityRoute && !rewardsRoute
	);

	const addressModalId = Symbol();
	const referralModalId = Symbol();
	const tipModalId = Symbol();
	const universalScannerModalId = Symbol();
	const payDialogModalId = Symbol();
	const goldModalId = Symbol();
	const vipModalId = Symbol();
</script>

<!--
	The dot is the only thing outside the menu that knows a tip needs attention, so
	it is what makes the count inside worth opening the menu for. It costs nothing:
	`tipsOverview` is derived from the tips the app already loaded once at sign-in,
	with no polling and no extra call.
-->
<span class="relative inline-flex">
	<ButtonIcon
		ariaLabel={$i18n.navigation.alt.menu}
		colorStyle="tertiary-alt"
		expanded={visible}
		link={false}
		onclick={() => (visible = true)}
		testId={NAVIGATION_MENU_BUTTON}
		bind:button
	>
		{#snippet icon()}
			<IconUser size="24" />
		{/snippet}
		{$i18n.navigation.alt.menu}
	</ButtonIcon>

	{#if $tipsOverview.failed > 0}
		<!--
			`aria-hidden`, with the real information carried as text on the menu item
			itself: a bare dot announced to a screen reader says something is wrong
			without saying what, and the count inside says both.
		-->
		<span
			class="pointer-events-none absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-warning-primary ring-2 ring-primary"
			aria-hidden="true"
			data-tid={NAVIGATION_MENU_TIP_BADGE}
		></span>
	{/if}
</span>

<Popover anchor={button} direction="rtl" bind:visible>
	<div
		class="mb-1 flex max-w-80 flex-col gap-1"
		data-tid={NAVIGATION_MENU}
		onclick={hidePopover}
		role="none"
	>
		{#if $authNotSignedIn}
			<div class="mb-2 text-center text-base font-semibold">
				{$i18n.auth.text.sign_in_or_sign_up}
			</div>
			<span class="mb-2 text-center">
				<ButtonAuthenticateWithHelp fullWidth helpAlignment="center" needHelpLink={false} />
			</span>
			<Hr />

			<AboutWhyOisy
				asMenuItem
				asMenuItemCondensed
				onIcOpenAboutModal={hidePopover}
				trackEventSource={USER_MENU_ROUTE}
			/>

			<DocumentationLink
				asMenuItem
				asMenuItemCondensed
				testId={NAVIGATION_MENU_DOC_BUTTON}
				trackEventSource={USER_MENU_ROUTE}
			/>

			<SupportLink asMenuItem asMenuItemCondensed testId={NAVIGATION_MENU_SUPPORT_BUTTON} />
		{/if}
		{#if $authSignedIn}
			{#if addressesOption}
				<MenuAddresses onReceiveClick={hidePopover} />
			{/if}

			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.address_book}
				onclick={() => modalStore.openAddressBook({ id: addressModalId })}
				testId={NAVIGATION_MENU_ADDRESS_BOOK_BUTTON}
			>
				<IconUsersRound size="20" />
				{$i18n.navigation.text.address_book}
			</ButtonMenu>

			<ButtonMenu
				ariaLabel={$isPrivacyMode
					? $i18n.navigation.alt.show_balances
					: $i18n.navigation.alt.hide_balances}
				onclick={handlePrivacyToggle}
				tag={$i18n.shortcuts.privacy_mode}
				testId={NAVIGATION_MENU_PRIVACY_MODE_BUTTON}
			>
				{#if $isPrivacyMode}
					<IconEye />
					{$i18n.navigation.text.show_balances}
				{:else}
					<IconEyeOff />
					{$i18n.navigation.text.hide_balances}
				{/if}
			</ButtonMenu>

			<Hr />

			<ButtonMenu
				ariaLabel={$i18n.navigation.text.wallet_connect}
				onclick={() => modalStore.openUniversalScanner({ id: universalScannerModalId })}
				styleClass="group"
				testId={NAVIGATION_MENU_SCANNER_BUTTON}
			>
				<IconMaximize />

				<span class="flex w-full items-center justify-between">
					{$i18n.navigation.text.wallet_connect}

					<span
						class="text-tertiary-inverted transition-colors duration-700 group-hover:text-brand-primary-alt"
					>
						<IconWalletConnect />
					</span>
				</span>
			</ButtonMenu>

			<ButtonMenu
				ariaLabel={replaceOisyPlaceholders($i18n.navigation.text.pay)}
				onclick={() => modalStore.openPayDialog(payDialogModalId)}
				styleClass="group"
				testId={NAVIGATION_MENU_PAY_BUTTON}
			>
				<IconMaximize />

				<span class="flex w-full items-center justify-between">
					{replaceOisyPlaceholders($i18n.navigation.text.pay)}

					<span
						class="text-tertiary-inverted transition-colors duration-700 group-hover:text-brand-primary-alt"
					>
						<IconPay />
					</span>
				</span>
			</ButtonMenu>

			{#if TIPS_ENABLED}
				<ButtonMenu
					ariaLabel={$i18n.navigation.alt.issue_tip}
					onclick={() => modalStore.openTip(tipModalId)}
					testId={NAVIGATION_MENU_TIP_BUTTON}
				>
					<IconQr size="20" />

					<!--
						The count, where the dot on the icon only said "something". Inside the
						menu there is room to say how many, and it is read out rather than
						announced as a decoration.
					-->
					<span class="flex flex-1 items-center justify-between gap-2">
						{$i18n.navigation.text.issue_tip}

						{#if $tipsOverview.failed > 0}
							<Badge testId={NAVIGATION_MENU_TIP_COUNT} variant="warning" width="w-fit">
								{$tipsOverview.failed}
							</Badge>
						{/if}
					</span>
				</ButtonMenu>
			{/if}

			<Hr />

			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.refer_a_friend}
				onclick={() => modalStore.openReferralCode(referralModalId)}
				testId={NAVIGATION_MENU_REFERRAL_BUTTON}
			>
				<IconShare size="20" />
				{$i18n.navigation.text.refer_a_friend}
			</ButtonMenu>

			<ExternalLink
				ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.support)}
				asMenuItem
				asMenuItemCondensed
				href={OISY_SUPPORT_URL}
				iconVisible={false}
				styleClass="group"
				testId={NAVIGATION_MENU_SUPPORT_BUTTON}
			>
				<IconHelpCircle />

				<span class="flex w-full items-center justify-between">
					{$i18n.navigation.text.support}

					<span
						class="text-tertiary-inverted transition-colors duration-700 group-hover:text-brand-primary-alt"
					>
						<IconExternalLink size="16" />
					</span>
				</span>
			</ExternalLink>

			<Hr />

			{#if isVip}
				<ButtonMenu
					ariaLabel={$i18n.navigation.alt.vip_qr_code}
					onclick={() => modalStore.openVipQrCode({ id: goldModalId, data: QrCodeType.VIP })}
					testId={NAVIGATION_MENU_VIP_BUTTON}
				>
					<IconVipQr size="20" />
					{$i18n.navigation.text.vip_qr_code}
				</ButtonMenu>
			{/if}

			{#if isGold}
				<ButtonMenu
					ariaLabel={$i18n.navigation.alt.binance_qr_code}
					onclick={() => modalStore.openVipQrCode({ id: vipModalId, data: QrCodeType.GOLD })}
					testId={NAVIGATION_MENU_GOLD_BUTTON}
				>
					<IconBinance size="20" />
					{$i18n.navigation.text.binance_qr_code}
				</ButtonMenu>
			{/if}

			{#if isGold || isVip}
				<Hr />
			{/if}
		{/if}
	</div>

	<div class="flex max-w-80 flex-col gap-1 pt-5 pb-1">
		{#if $authNotSignedIn}
			<MenuLanguageSelector />
		{/if}

		{#if $authSignedIn}
			<MenuThemeSelector />

			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.settings}
				onclick={goToSettings}
				testId={NAVIGATION_MENU_SETTINGS_BUTTON}
			>
				<IconlySettings size="20" />
				{$i18n.navigation.text.settings}
			</ButtonMenu>
		{/if}
	</div>

	{#if $authSignedIn}
		<Hr />

		<div class="my-4 flex max-w-80 flex-col">
			<LockOrSignOut onHidePopover={hidePopover} />
		</div>
	{/if}

	<Hr />

	<div
		class="mt-4 flex max-w-80 flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-nowrap text-tertiary"
	>
		<TermsOfUseLink />
		<PrivacyPolicyLink />
		<LicenseAgreementLink />
	</div>
</Popover>

<script lang="ts">
	import { IconUser, Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import ButtonAuthenticateWithLicense from '$lib/components/auth/ButtonAuthenticateWithLicense.svelte';
	import MenuAddresses from '$lib/components/core/MenuAddresses.svelte';
	import MenuLanguageSelector from '$lib/components/core/MenuLanguageSelector.svelte';
	import MenuThemeSelector from '$lib/components/core/MenuThemeSelector.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import MenuCurrencySelector from '$lib/components/currency/MenuCurrencySelector.svelte';
	import IconBinance from '$lib/components/icons/IconBinance.svelte';
	import IconVipQr from '$lib/components/icons/IconVipQr.svelte';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconShare from '$lib/components/icons/lucide/IconShare.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import SupportLink from '$lib/components/navigation/SupportLink.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { USER_MENU_ROUTE } from '$lib/constants/analytics.contants';
	import {
		NAVIGATION_MENU_BUTTON,
		NAVIGATION_MENU,
		NAVIGATION_MENU_VIP_BUTTON,
		NAVIGATION_MENU_REFERRAL_BUTTON,
		NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
		NAVIGATION_MENU_GOLD_BUTTON,
		NAVIGATION_MENU_PRIVACY_MODE_BUTTON,
		NAVIGATION_MENU_SUPPORT_BUTTON,
		NAVIGATION_MENU_DOC_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity, authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { getUserRoles } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		isRouteActivity,
		isRouteRewards,
		isRouteDappExplorer,
		isRouteSettings
	} from '$lib/utils/nav.utils';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';
	import IconUsersRound from '../icons/lucide/IconUsersRound.svelte';

	let visible = $state(false);
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

	const settingsRoute = $derived(isRouteSettings(page));
	const dAppExplorerRoute = $derived(isRouteDappExplorer(page));
	const activityRoute = $derived(isRouteActivity(page));
	const rewardsRoute = $derived(isRouteRewards(page));
	const addressesOption = $derived(
		!settingsRoute && !dAppExplorerRoute && !activityRoute && !rewardsRoute
	);

	const addressModalId = Symbol();
	const referralModalId = Symbol();
	const goldModalId = Symbol();
	const vipModalId = Symbol();
</script>

<ButtonIcon
	bind:button
	onclick={() => (visible = true)}
	ariaLabel={$i18n.navigation.alt.menu}
	testId={NAVIGATION_MENU_BUTTON}
	colorStyle="tertiary-alt"
	link={false}
>
	{#snippet icon()}
		<IconUser size="24" />
	{/snippet}
	{$i18n.navigation.alt.menu}
</ButtonIcon>

<Popover bind:visible anchor={button} direction="rtl">
	<div
		class="mb-1 flex max-w-80 flex-col gap-1"
		data-tid={NAVIGATION_MENU}
		onclick={hidePopover}
		role="none"
	>
		{#if $authNotSignedIn}
			<span class="mb-2 text-center">
				<ButtonAuthenticateWithLicense fullWidth needHelpLink={false} licenseAlignment="center" />
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
				trackEventSource={USER_MENU_ROUTE}
				testId={NAVIGATION_MENU_DOC_BUTTON}
			/>

			<SupportLink asMenuItem asMenuItemCondensed testId={NAVIGATION_MENU_SUPPORT_BUTTON} />
		{/if}
		{#if $authSignedIn}
			{#if addressesOption}
				<MenuAddresses on:icMenuClick={hidePopover} />
			{/if}

			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.address_book}
				testId={NAVIGATION_MENU_ADDRESS_BOOK_BUTTON}
				onclick={() => modalStore.openAddressBook({ id: addressModalId })}
			>
				<IconUsersRound size="20" />
				{$i18n.navigation.text.address_book}
			</ButtonMenu>

			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.refer_a_friend}
				testId={NAVIGATION_MENU_REFERRAL_BUTTON}
				onclick={() => modalStore.openReferralCode(referralModalId)}
			>
				<IconShare size="20" />
				{$i18n.navigation.text.refer_a_friend}
			</ButtonMenu>

			<ButtonMenu
				ariaLabel={$isPrivacyMode
					? $i18n.navigation.alt.show_balances
					: $i18n.navigation.alt.hide_balances}
				testId={NAVIGATION_MENU_PRIVACY_MODE_BUTTON}
				onclick={handlePrivacyToggle}
				tag={$i18n.shortcuts.privacy_mode}
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

			{#if isVip}
				<ButtonMenu
					ariaLabel={$i18n.navigation.alt.vip_qr_code}
					testId={NAVIGATION_MENU_VIP_BUTTON}
					onclick={() => modalStore.openVipQrCode({ id: goldModalId, data: QrCodeType.VIP })}
				>
					<IconVipQr size="20" />
					{$i18n.navigation.text.vip_qr_code}
				</ButtonMenu>
			{/if}

			{#if isGold}
				<ButtonMenu
					ariaLabel={$i18n.navigation.alt.binance_qr_code}
					testId={NAVIGATION_MENU_GOLD_BUTTON}
					onclick={() => modalStore.openVipQrCode({ id: vipModalId, data: QrCodeType.GOLD })}
				>
					<IconBinance size="20" />
					{$i18n.navigation.text.binance_qr_code}
				</ButtonMenu>
			{/if}
		{/if}

		{#if isGold || isVip}
			<Hr />
		{/if}
	</div>

	<div class="flex max-w-80 flex-col gap-5 py-5">
		<MenuLanguageSelector />

		{#if $authSignedIn}
			<MenuCurrencySelector />

			<MenuThemeSelector />
		{/if}
	</div>

	{#if $authSignedIn}
		<Hr />

		<div class="flex max-w-80 flex-col gap-3 pt-3">
			<SignOut on:icLogoutTriggered={hidePopover} />

			<Hr />

			<span class="text-center text-sm text-tertiary">
				<LicenseLink noUnderline />
			</span>
		</div>
	{/if}
</Popover>

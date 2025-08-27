<script lang="ts">
	import { IconUser, Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
	import { LOCK_SCREEN_ENABLED } from '$env/lock-screen.env';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import ButtonAuthenticateWithLicense from '$lib/components/auth/ButtonAuthenticateWithLicense.svelte';
	import LockOrSignOut from '$lib/components/core/LockOrSignOut.svelte';
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
	import IconUsersRound from '$lib/components/icons/lucide/IconUsersRound.svelte';
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
	ariaLabel={$i18n.navigation.alt.menu}
	colorStyle="tertiary-alt"
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

<Popover anchor={button} direction="rtl" bind:visible>
	<div
		class="mb-1 flex max-w-80 flex-col gap-1"
		data-tid={NAVIGATION_MENU}
		onclick={hidePopover}
		role="none"
	>
		{#if $authNotSignedIn}
			<span class="mb-2 text-center">
				{#if NEW_AGREEMENTS_ENABLED}
					<ButtonAuthenticateWithHelp fullWidth licenseAlignment="center" needHelpLink={false} />
				{:else}
					<ButtonAuthenticateWithLicense fullWidth licenseAlignment="center" needHelpLink={false} />
				{/if}
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
				ariaLabel={$i18n.navigation.alt.refer_a_friend}
				onclick={() => modalStore.openReferralCode(referralModalId)}
				testId={NAVIGATION_MENU_REFERRAL_BUTTON}
			>
				<IconShare size="20" />
				{$i18n.navigation.text.refer_a_friend}
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
			{#if LOCK_SCREEN_ENABLED}
				<LockOrSignOut onHidePopover={hidePopover} />
			{:else}
				<SignOut on:icLogoutTriggered={hidePopover} />
			{/if}
			<Hr />

			<span class="text-center text-sm text-tertiary">
				<LicenseLink noUnderline />
			</span>
		</div>
	{/if}
</Popover>

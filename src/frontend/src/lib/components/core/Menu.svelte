<script lang="ts">
	import { IconUser, Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { ADDRESS_BOOK_ENABLED } from '$env/address-book.env';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import MenuAddresses from '$lib/components/core/MenuAddresses.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import IconBinance from '$lib/components/icons/IconBinance.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconVipQr from '$lib/components/icons/IconVipQr.svelte';
	import IconEye from '$lib/components/icons/lucide/IconEye.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconShare from '$lib/components/icons/lucide/IconShare.svelte';
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import SupportLink from '$lib/components/navigation/SupportLink.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { USER_MENU_ROUTE } from '$lib/constants/analytics.contants';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import {
		NAVIGATION_MENU_BUTTON,
		NAVIGATION_MENU,
		NAVIGATION_MENU_VIP_BUTTON,
		NAVIGATION_MENU_REFERRAL_BUTTON,
		NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
		NAVIGATION_MENU_GOLD_BUTTON,
		NAVIGATION_MENU_PRIVACY_MODE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { getUserRoles } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { privacyModeStore } from '$lib/stores/settings.store';
	import {
		isRouteActivity,
		isRouteRewards,
		isRouteDappExplorer,
		isRouteSettings
	} from '$lib/utils/nav.utils';

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

<Popover bind:visible anchor={button} direction="rtl" on:click={hidePopover}>
	<div class="max-w-68 flex flex-col gap-1" data-tid={NAVIGATION_MENU}>
		<ButtonMenu
			ariaLabel={$isPrivacyMode
				? $i18n.navigation.alt.show_balances
				: $i18n.navigation.alt.hide_balances}
			testId={NAVIGATION_MENU_PRIVACY_MODE_BUTTON}
			onclick={() =>
				privacyModeStore.set({ key: 'privacy-mode', value: { enabled: !$isPrivacyMode } })}
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

		{#if addressesOption}
			<MenuAddresses on:icMenuClick={hidePopover} />
			<Hr />
		{/if}

		{#if ADDRESS_BOOK_ENABLED}
			<ButtonMenu
				ariaLabel={$i18n.navigation.alt.address_book}
				testId={NAVIGATION_MENU_ADDRESS_BOOK_BUTTON}
				onclick={() => modalStore.openAddressBook({ id: addressModalId })}
			>
				<IconUserSquare size="20" />
				{$i18n.navigation.text.address_book}
			</ButtonMenu>

			<Hr />
		{/if}

		<ButtonMenu
			ariaLabel={$i18n.navigation.alt.refer_a_friend}
			testId={NAVIGATION_MENU_REFERRAL_BUTTON}
			onclick={() => modalStore.openReferralCode(referralModalId)}
		>
			<IconShare size="20" />
			{$i18n.navigation.text.refer_a_friend}
		</ButtonMenu>

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

		<Hr />

		<AboutWhyOisy
			asMenuItem
			asMenuItemCondensed
			on:icOpenAboutModal={hidePopover}
			trackEventSource={USER_MENU_ROUTE}
		/>

		<DocumentationLink asMenuItem asMenuItemCondensed trackEventSource={USER_MENU_ROUTE} />

		<SupportLink asMenuItem asMenuItemCondensed />

		<Hr />

		<a
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="nav-item nav-item-condensed"
			aria-label={$i18n.navigation.text.source_code_on_github}
		>
			<IconGitHub />
			{$i18n.navigation.text.source_code}
		</a>

		<ChangelogLink asMenuItem asMenuItemCondensed trackEventSource={USER_MENU_ROUTE} />

		<Hr />

		<SignOut on:icLogoutTriggered={hidePopover} />

		<Hr />

		<span class="text-center text-sm text-tertiary">
			<LicenseLink noUnderline />
		</span>
	</div>
</Popover>

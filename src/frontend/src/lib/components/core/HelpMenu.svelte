<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconHelpCircle from '$lib/components/icons/IconHelpCircle.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ChangelogLink from '$lib/components/navigation/ChangelogLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import SupportLink from '$lib/components/navigation/SupportLink.svelte';
	import PrivacyPolicyLink from '$lib/components/privacy-policy/PrivacyPolicyLink.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { USER_MENU_ROUTE } from '$lib/constants/analytics.contants';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import {
		NAVIGATION_MENU_BUTTON,
		NAVIGATION_MENU,
		NAVIGATION_MENU_SUPPORT_BUTTON,
		NAVIGATION_MENU_DOC_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible?: boolean;
	}

	let { visible = $bindable(false) }: Props = $props();

	let button = $state<HTMLButtonElement | undefined>();

	const hidePopover = () => (visible = false);
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
		<IconHelpCircle size="22" />
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

		<Hr />

		<a
			class="nav-item nav-item-condensed"
			aria-label={$i18n.navigation.text.source_code_on_github}
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
		>
			<IconGitHub />
			{$i18n.navigation.text.source_code}
		</a>

		<ChangelogLink asMenuItem asMenuItemCondensed trackEventSource={USER_MENU_ROUTE} />
	</div>

	{#if NEW_AGREEMENTS_ENABLED}
		<Hr />

		<div class="mt-2 flex gap-2 text-nowrap text-xs text-tertiary">
			<TermsOfUseLink />
			<PrivacyPolicyLink />
			<LicenseLink />
		</div>
	{/if}
</Popover>

<script lang="ts">
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import InviteRewardsBanner from '$lib/components/ui/InviteRewardsBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex flex-col items-center text-center">
	<!-- Invite Rewards Banner -->
	<div class="flex justify-center">
		<InviteRewardsBanner />
	</div>

	<div class="mt-5 mb-7 pt-2">
		<h1 class="text-4xl md:leading-tight lg:text-5xl">
			{replaceOisyPlaceholders($i18n.auth.text.title_part_1)}<br /><span
				class="text-brand-primary-alt">{$i18n.auth.text.title_part_2}</span
			>
		</h1>
	</div>

	<ButtonAuthenticateWithHelp helpAlignment="center" needHelpLink={false} />
</div>

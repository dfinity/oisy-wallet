<script lang="ts">
	import helpAuthBanner from '$lib/assets/help-auth-banner.svg';
	import IconAnnoyed from '$lib/components/icons/lucide/IconAnnoyed.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconX from '$lib/components/icons/lucide/IconX.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { HELP_AUTH_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import {i18n} from "$lib/stores/i18n.store";

	export let onLostIdentity: () => void;
	export let onOther: () => void;
</script>

<div class="grid gap-6">
	<Img src={helpAuthBanner} styleClass="w-full" testId={HELP_AUTH_IMAGE_BANNER} />

	<span>{$i18n.auth.help.text.description}</span>

	<div>
		<p class="text-md font-bold">{$i18n.auth.help.text.subtitle}</p>
		<div class="grid gap-2">
			<Button colorStyle="info-alt" type="button" fullWidth on:click={onLostIdentity}>
				<span class="text-error-primary"><IconX /></span>{$i18n.auth.help.text.lost_identity}
			</Button>

			<Button colorStyle="info-alt" type="button" fullWidth on:click={onOther}>
				<span class="text-error-primary"><IconShieldCheck /></span>{$i18n.auth.help.text.security}
			</Button>

			<Button colorStyle="info-alt" type="button" fullWidth on:click={onOther}>
				<span class="text-error-primary"><IconAnnoyed /></span>{$i18n.auth.help.text.got_confused}
			</Button>

			<Button colorStyle="info-alt" type="button" fullWidth on:click={onOther}>{$i18n.auth.help.text.other}</Button>
		</div>
	</div>

	<div>
		<i class="block">{$i18n.auth.help.text.feedback_text}</i>
		<i class="block">{$i18n.auth.help.text.thanks_text}</i>
	</div>
</div>

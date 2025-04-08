<script lang="ts">
	import helpAuthBanner from '$lib/assets/help-auth-banner.svg';
	import IconAnnoyed from '$lib/components/icons/lucide/IconAnnoyed.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconX from '$lib/components/icons/lucide/IconX.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { HELP_AUTH_IMAGE_BANNER } from '$lib/constants/test-ids.constants';

	export let onLostIdentity: () => void;
	export let onOther: () => void;
</script>

<div class="grid gap-6">
	<Img src={helpAuthBanner} styleClass="w-full" testId={HELP_AUTH_IMAGE_BANNER} />

	<span>
		We noticed you cancelled authentication with Internet Identity. We'd love to understand what
		happened so we can improve your experience.
	</span>

	<div>
		<p class="text-md font-bold"> Did any of the following cause the issue? </p>
		<div class="grid gap-2">
			<Button colorStyle="info-alt" type="button" fullWidth on:click={onLostIdentity}>
				<span class="text-error-primary"><IconX /></span> I lost my Internet Identity number
			</Button>

			<Button colorStyle="info-alt" type="button" fullWidth on:click={onOther}>
				<span class="text-error-primary"><IconShieldCheck /></span> I was concerned about security or
				privacy
			</Button>

			<Button colorStyle="info-alt" type="button" fullWidth on:click={onOther}>
				<span class="text-error-primary"><IconAnnoyed /></span> I got confused during process
			</Button>

			<Button colorStyle="info-alt" type="button" fullWidth on:click={onOther}>Other...</Button>
		</div>
	</div>

	<div>
		<i class="block">Your feedback helps us to make the wallet better.</i>
		<i class="block">Thank you!</i>
	</div>
</div>

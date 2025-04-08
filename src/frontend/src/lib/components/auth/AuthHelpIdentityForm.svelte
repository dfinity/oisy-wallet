<script lang="ts">
	import helpAuthIdentityBanner from '$lib/assets/help-auth-identity-banner.svg';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { HELP_AUTH_IDENTITY_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let onBack: () => void;
	export let onDone: () => void;
</script>

<ContentWithToolbar>
	<div class="grid gap-6">
		<Img
			src={helpAuthIdentityBanner}
			styleClass="w-full"
			testId={HELP_AUTH_IDENTITY_IMAGE_BANNER}
		/>

		<div>
			<p>
				OISY now uses a new Internet Identity domain:
				<span class="font-bold">identity.internetcomputer.org</span>
			</p>
			<p>
				As a result, your old Internet Identity number might not appear automatically, and you may
				need to re-enter it.
			</p>
			<p>
				<ExternalLink iconVisible={false} styleClass="font-semibold" ariaLabel="" href="">
					Sign in with legacy Internet Identity domain
				</ExternalLink>
			</p>
			<p class="mb-0">
				<ExternalLink styleClass="font-semibold flex flex-row-reverse" ariaLabel="" href="">
					Learn more on OISY Docs
				</ExternalLink>
			</p>
		</div>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={onBack} />
		<ButtonDone on:click={onDone} />
	</ButtonGroup>
</ContentWithToolbar>

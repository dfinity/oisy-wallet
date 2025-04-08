<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import {trackEvent} from "$lib/services/analytics.services";
	import {TRACK_HELP_SIGNING_IN} from "$lib/constants/analytics.contants";

	export let noUnderline = false;
	export let styleClass = '';

	const onClick = async () => {
		await trackEvent({
			name: TRACK_HELP_SIGNING_IN
		});
		modalStore.openAuthHelp(true);
	}
</script>

<span class={`${styleClass}`}>
	{$i18n.auth.help.text.need_help}
	<a
		onclick={onClick}
		aria-label={replaceOisyPlaceholders($i18n.auth.help.alt.sign_in)}
		class:no-underline={noUnderline}
	>
		{$i18n.auth.help.text.sign_in}
	</a>
</span>

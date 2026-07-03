<script lang="ts">
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

{#snippet shieldIcon()}
	<div class="min-w-5 py-0 text-success-primary sm:py-0.5">
		<IconShieldCheck size="20" />
	</div>
{/snippet}

<!-- A neutral-grey box (the modal surface is white, so the plain level's white
	background would be invisible). Grey, not a blue tint, since there's already
	blue above (the Note panel) and below (Cancel/Save). -->
<MessageBox icon={shieldIcon} level="plain" styleClass="w-full bg-tertiary! text-left">
	<strong>{`${$i18n.notes.text.encrypted_lead} `}</strong>{$i18n.notes.text
		.encrypted_info}<ExternalLink
		ariaLabel={$i18n.core.text.learn_more}
		color="blue"
		href={OISY_DOCS_URL}
		iconVisible={false}
	>
		{$i18n.core.text.learn_more}
	</ExternalLink>
</MessageBox>

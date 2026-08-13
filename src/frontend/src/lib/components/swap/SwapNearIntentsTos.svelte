<script lang="ts">
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { NEAR_INTENTS_TOS_LINK } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
</script>

<MessageBox styleClass="sm:text-sm">
	<Html
		text={replacePlaceholders($i18n.swap.text.near_intents_tos, {
			$link: NEAR_INTENTS_TOS_LINK
		})}
	/>
</MessageBox>

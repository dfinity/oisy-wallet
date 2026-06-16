<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<p class="text-tertiary mt-4">{replaceOisyPlaceholders($i18n.dapps.text.sign_in)}</p>

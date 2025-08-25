<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
</script>

<h1 class="mb-4">{$i18n.termsOfUse.text.title}</h1>

<Markdown
	text={replacePlaceholders($i18n.termsOfUse.text.body, {
		$date: 'todo'
	})}
/>

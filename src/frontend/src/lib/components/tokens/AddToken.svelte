<script lang="ts">
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button on:click class="contents">
	<Card>
		<span>{$i18n.tokens.text.add_new}</span>

		<RoundedIcon
			slot="icon"
			icon={IconPlus}
			backgroundStyleClass="bg-white"
			additionalStyleClass="border: 1px solid var(--color-dust);"
			iconSize="2.9rem"
		/>
	</Card>
</button>

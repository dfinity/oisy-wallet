<script lang="ts">
import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
</script>

<button class={`contents`} on:click>

	<AirdropCard>
		<div slot="icon">
			<IconSend />
		</div>

		<div slot="title">
			title
		</div>

		<div slot="description">
			description
		</div>
	</AirdropCard>
</button>
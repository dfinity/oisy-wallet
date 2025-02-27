<script lang="ts">
	export let styleClass = '';
</script>

<div class={`group flex gap-3 sm:gap-8 ${styleClass}`}>
	<button class="flex-1" on:click>
		<div class="w-full">
			<slot />
		</div>
	</button>

	<slot name="actions" />
</div>

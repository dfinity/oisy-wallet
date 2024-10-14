<script lang="ts">
</script>

<div
	class="relative rounded-3xl bg-white pt-12 p-4 flex-1 hover:shadow transition-shadow {$$restProps.class || ''}">
	<div class="flex flex-col justify-between gap-y-2 h-full">
		<slot name="content"></slot>
		<slot name="footer"></slot>
	</div>
</div>

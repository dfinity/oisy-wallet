<script lang="ts">

	export let testId: string | undefined = undefined;
</script>

<div class="flex items-center gap-4" data-tid={testId}>
	<slot name="icon" />

	<div class="flex flex-1 flex-col justify-center">

		<span class="inline-flex items-center text-left">
			<slot name="title" />
		</span>

		<span class="inline-flex items-center text-left text-misty-rose">
			<slot name="description" />
		</span>
	</div>

</div>
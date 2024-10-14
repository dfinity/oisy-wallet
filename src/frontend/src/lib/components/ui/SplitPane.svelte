<main
	class="relative mx-auto max-w-screen-2.5xl pt-8 sm:flex sm:w-full sm:flex-row lg:w-auto lg:pt-0"
>
	<div
		class="invisible absolute -translate-x-full transition-all duration-200 ease-in-out sm:visible sm:fixed sm:top-0 sm:mt-24 sm:block sm:min-w-44 sm:translate-x-0 md:transition-none"
	>
		<slot name="menu" />
	</div>

	<div
		class="mx-auto px-5 transition-all duration-500 ease-linear sm:ml-44 sm:box-content sm:w-sm lg:ml-auto"
	>
		<slot />
	</div>
</main>

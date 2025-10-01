import { mount, unmount, type Component, type ComponentProps } from 'svelte';

export const componentToHtml = <T extends Component>({
	Component,
	props
}: {
	Component: T;
	props?: ComponentProps<T>;
}): string => {
	const container = document.createElement('div');

	try {
		const component = mount(Component, {
			target: container,
			props
		});

		const html = container.innerHTML;

		unmount(component, { outro: false });

		return html;
	} catch (error: unknown) {
		console.error('Error rendering component to HTML:', error);
		return '';
	} finally {
		container.remove();
	}
};

import ExtensionRequest from '$lib/components/extension/ExtensionRequest.svelte';
import {
	OISY_EXTENSION_INTERNAL_ERROR_CODE,
	OISY_EXTENSION_MIN_VERSION,
	OISY_EXTENSION_OUTDATED_MESSAGE
} from '$lib/constants/extension.constants';
import * as extensionProviders from '$lib/providers/extension.providers';
import type { ExtensionPort } from '$lib/types/extension';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('ExtensionRequest', () => {
	const requestId = 'request-1';
	const pairRequest = { id: requestId, kind: 'pair' };

	let receive: (message: unknown) => void;
	let port: ExtensionPort;

	beforeEach(() => {
		vi.clearAllMocks();

		port = {
			postMessage: vi.fn(),
			disconnect: vi.fn(),
			onMessage: {
				addListener: (listener) => {
					receive = listener;
				}
			},
			onDisconnect: { addListener: vi.fn() }
		};

		vi.spyOn(extensionProviders, 'connectExtension').mockReturnValue(port);
		mockPage.mockUrl(new URL(`http://localhost:5175/extension/?request=${requestId}`));
	});

	it('asks the extension for the request named in the URL', () => {
		render(ExtensionRequest);

		expect(port.postMessage).toHaveBeenCalledWith({ type: 'get-request', id: requestId });
	});

	it('shows the request when the extension version is supported', async () => {
		const { getByText, queryByText } = render(ExtensionRequest);

		receive({ type: 'request', request: pairRequest, version: OISY_EXTENSION_MIN_VERSION });
		await tick();

		expect(getByText(en.extension.connect.title_extension)).toBeInTheDocument();
		expect(queryByText(en.extension.text.outdated)).not.toBeInTheDocument();
	});

	it.each([
		{ label: 'an older version', version: '0.0.0' },
		{ label: 'no version', version: undefined }
	])(
		'refuses the request and asks for an update when the extension reports $label',
		async ({ version }) => {
			const { getByText, queryByText } = render(ExtensionRequest);

			receive({ type: 'request', request: pairRequest, version });
			await tick();

			expect(getByText(en.extension.text.outdated)).toBeInTheDocument();
			expect(queryByText(en.extension.connect.title_extension)).not.toBeInTheDocument();
			expect(port.postMessage).toHaveBeenCalledWith({
				type: 'error',
				id: requestId,
				error: {
					code: OISY_EXTENSION_INTERNAL_ERROR_CODE,
					message: OISY_EXTENSION_OUTDATED_MESSAGE
				}
			});
			expect(port.postMessage).toHaveBeenCalledWith({ type: 'update-check' });
		}
	);

	it('says the extension is unreachable when no extension answers', () => {
		vi.spyOn(extensionProviders, 'connectExtension').mockReturnValue(undefined);

		const { getByText } = render(ExtensionRequest);

		expect(getByText(en.extension.text.no_extension)).toBeInTheDocument();
	});
});

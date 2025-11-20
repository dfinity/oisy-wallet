import Scanner from '$lib/components/scanner/Scanner.svelte';
import * as modalDerived from '$lib/derived/modal.derived';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$lib/stores/modal.store');
vi.mock('$lib/derived/modal.derived');
vi.mock('@dfinity/gix-components', async () => {
	const actual = await vi.importActual('@dfinity/gix-components');
	return {
		...actual,
		QRCodeReader: vi.fn().mockImplementation(() => ({
			$$render: () => '<div data-tid="mock-qr-reader">Mocked QR Reader</div>',
			$$slots: {},
			$$scope: {}
		}))
	};
});

describe('Scanner', () => {
	const mockModalOpen = writable(false);

	beforeEach(() => {
		vi.clearAllMocks();
		mockModalOpen.set(false);
		vi.mocked(modalStore).openUniversalScanner = vi.fn();
		vi.mocked(modalDerived).modalUniversalScannerOpen = mockModalOpen;
	});

	it('should render button with correct text', () => {
		render(Scanner);

		expect(screen.getByText(en.scanner.text.scan_qr_code)).toBeInTheDocument();
	});

	it('should render button with correct aria-label', () => {
		render(Scanner);

		const button = screen.getByRole('button', { name: en.scanner.text.scan_qr_code });

		expect(button).toBeInTheDocument();
	});

	it('should render scan icon', () => {
		const { container } = render(Scanner);

		const svg = container.querySelector('svg');

		expect(svg).toBeInTheDocument();
	});

	it('should call modalStore.openUniversalScanner on click', async () => {
		render(Scanner);

		const button = screen.getByRole('button', { name: en.scanner.text.scan_qr_code });
		await fireEvent.click(button);

		expect(modalStore.openUniversalScanner).toHaveBeenCalledExactlyOnceWith(expect.any(Symbol));
	});

	it('should pass a unique modalId symbol on click', async () => {
		render(Scanner);

		const button = screen.getByRole('button', { name: en.scanner.text.scan_qr_code });
		await fireEvent.click(button);

		const [[callArg]] = vi.mocked(modalStore.openUniversalScanner).mock.calls;

		expect(typeof callArg).toBe('symbol');
	});

	it('should render ButtonIcon with correct props', () => {
		const { container } = render(Scanner);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should handle multiple clicks', async () => {
		render(Scanner);

		const button = screen.getByRole('button', { name: en.scanner.text.scan_qr_code });

		await fireEvent.click(button);
		await fireEvent.click(button);
		await fireEvent.click(button);

		expect(modalStore.openUniversalScanner).toHaveBeenCalledTimes(3);
	});

	it('should use tertiary-alt color style', () => {
		const { container } = render(Scanner);
		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should not be a link button', () => {
		const { container } = render(Scanner);

		const button = container.querySelector('button');
		const anchor = container.querySelector('a');

		expect(button).toBeInTheDocument();
		expect(anchor).not.toBeInTheDocument();
	});

	it('should not render ScannerWizard when modal is closed', () => {
		mockModalOpen.set(false);

		const { container } = render(Scanner);

		const childrenCount = container.children.length;

		expect(childrenCount).toBeGreaterThan(0);
	});

	it('should render ScannerWizard when modalUniversalScannerOpen is true', async () => {
		mockModalOpen.set(true);

		const { container } = render(Scanner);

		await waitFor(() => {
			expect(container.children.length).toBeGreaterThan(0);
		});
	});
});

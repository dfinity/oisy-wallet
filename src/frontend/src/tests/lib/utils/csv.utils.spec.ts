import { downloadCsv, toCsv, type CsvColumn, type CsvRow } from '$lib/utils/csv.utils';

describe('csv.utils', () => {
	describe('toCsv', () => {
		interface Row extends CsvRow {
			a: string;
			b: number | null;
			c: bigint | undefined;
		}

		const columns: CsvColumn<Row>[] = [
			{ key: 'a', header: 'A' },
			{ key: 'b', header: 'B' },
			{ key: 'c', header: 'C' }
		];

		it('emits a header line followed by data lines separated by CRLF', () => {
			const csv = toCsv({
				columns,
				rows: [
					{ a: 'one', b: 1, c: 10n },
					{ a: 'two', b: 2, c: 20n }
				]
			});

			expect(csv).toBe('A,B,C\r\none,1,10\r\ntwo,2,20');
		});

		it('returns only the header line for an empty rows array', () => {
			const csv = toCsv({ columns, rows: [] });

			expect(csv).toBe('A,B,C');
		});

		it('renders null and undefined cells as empty strings', () => {
			const csv = toCsv({
				columns,
				rows: [{ a: 'x', b: null, c: undefined }]
			});

			expect(csv).toBe('A,B,C\r\nx,,');
		});

		it('serializes bigint cells as plain digits without the n suffix', () => {
			const csv = toCsv({
				columns: [{ key: 'c', header: 'C' }],
				rows: [{ c: 123456789012345678901234567890n } as Row]
			});

			expect(csv).toBe('C\r\n123456789012345678901234567890');
		});

		it('quotes cells containing a comma', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A' }],
				rows: [{ a: 'hello, world' } as Row]
			});

			expect(csv).toBe('A\r\n"hello, world"');
		});

		it('quotes cells containing a newline', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A' }],
				rows: [{ a: 'line1\nline2' } as Row]
			});

			expect(csv).toBe('A\r\n"line1\nline2"');
		});

		it('quotes cells containing a carriage return', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A' }],
				rows: [{ a: 'line1\rline2' } as Row]
			});

			expect(csv).toBe('A\r\n"line1\rline2"');
		});

		it('doubles embedded quotes and wraps the cell in quotes', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A' }],
				rows: [{ a: 'say "hi"' } as Row]
			});

			expect(csv).toBe('A\r\n"say ""hi"""');
		});

		it('neutralizes cells that spreadsheets could evaluate as formulas', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A' }],
				rows: [
					{ a: '=HYPERLINK("https://example.com")', b: null, c: undefined },
					{ a: '+SUM(1,1)', b: null, c: undefined },
					{ a: '-SUM(1,1)', b: null, c: undefined },
					{ a: '@SUM(1,1)', b: null, c: undefined },
					{ a: '  =SUM(1,1)', b: null, c: undefined }
				]
			});

			expect(csv).toBe(
				[
					'A',
					`"'=HYPERLINK(""https://example.com"")"`,
					`"'+SUM(1,1)"`,
					`"'-SUM(1,1)"`,
					`"'@SUM(1,1)"`,
					`"'  =SUM(1,1)"`
				].join('\r\n')
			);
		});

		it('keeps negative numeric cells parseable by spreadsheets', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A' }],
				rows: [
					{ a: '-1.0001', b: null, c: undefined },
					{ a: '-1e-8', b: null, c: undefined }
				]
			});

			expect(csv).toBe('A\r\n-1.0001\r\n-1e-8');
		});

		it('quotes header cells when they contain a special character', () => {
			const csv = toCsv({
				columns: [{ key: 'a', header: 'A, with comma' }],
				rows: []
			});

			expect(csv).toBe('"A, with comma"');
		});
	});

	describe('downloadCsv', () => {
		let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
		let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
		let createElementSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
			revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
				/* noop */
			});
			createElementSpy = vi.spyOn(document, 'createElement');
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('creates a Blob, assigns it to an anchor with the given filename, and clicks it', () => {
			const clickSpy = vi.fn();
			const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
			createElementSpy.mockReturnValue(anchor);

			downloadCsv({ filename: 'tokens.csv', csv: 'A\r\n1' });

			expect(createObjectURLSpy).toHaveBeenCalledOnce();

			const [[blob]] = createObjectURLSpy.mock.calls;

			expect(blob).toBeInstanceOf(Blob);
			expect((blob as Blob).type).toBe('text/csv;charset=utf-8');

			expect(createElementSpy).toHaveBeenCalledWith('a');
			expect(anchor.href).toBe('blob:mock-url');
			expect(anchor.download).toBe('tokens.csv');
			expect(clickSpy).toHaveBeenCalledOnce();
		});

		it('revokes the object URL after click', () => {
			const anchor = {
				href: '',
				download: '',
				click: vi.fn()
			} as unknown as HTMLAnchorElement;
			createElementSpy.mockReturnValue(anchor);

			downloadCsv({ filename: 'tokens.csv', csv: 'A\r\n1' });

			expect(revokeObjectURLSpy).toHaveBeenCalledExactlyOnceWith('blob:mock-url');
		});

		it('prepends a UTF-8 BOM so Excel auto-detects the encoding', async () => {
			const anchor = {
				href: '',
				download: '',
				click: vi.fn()
			} as unknown as HTMLAnchorElement;
			createElementSpy.mockReturnValue(anchor);

			downloadCsv({ filename: 'tokens.csv', csv: 'A\r\nñ' });

			const [[blob]] = createObjectURLSpy.mock.calls;
			// Read as bytes (not text) — Blob.text() strips a leading BOM per the Encoding spec.
			const bytes = new Uint8Array(await (blob as Blob).arrayBuffer());

			expect(bytes[0]).toBe(0xef);
			expect(bytes[1]).toBe(0xbb);
			expect(bytes[2]).toBe(0xbf);
		});
	});
});

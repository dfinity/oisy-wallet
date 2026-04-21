import {
	parseCustomEvmNetworkForm,
	verifyCustomEvmNetworkForm,
	type CustomEvmNetworkFormValues
} from '$eth/services/custom-network-form.services';

const baseValues: CustomEvmNetworkFormValues = {
	name: 'Optimism',
	chainId: '10',
	rpcUrl: 'https://mainnet.optimism.io',
	currencySymbol: 'ETH',
	explorerUrl: 'https://optimistic.etherscan.io',
	iconUrl: '',
	env: 'mainnet'
};

describe('custom-network-form.services', () => {
	describe('parseCustomEvmNetworkForm', () => {
		describe('happy path', () => {
			it('coerces a fully valid form into a typed CustomEvmNetworkInput', () => {
				const result = parseCustomEvmNetworkForm(baseValues);

				expect(result).toEqual({
					ok: true,
					input: {
						name: 'Optimism',
						chainId: 10n,
						rpcUrl: 'https://mainnet.optimism.io',
						currencySymbol: 'ETH',
						explorerUrl: 'https://optimistic.etherscan.io',
						env: 'mainnet'
					}
				});
			});

			it('passes iconUrl through when present and omits it when empty', () => {
				const withIcon = parseCustomEvmNetworkForm({
					...baseValues,
					iconUrl: 'https://op.example/logo.png'
				});
				const withoutIcon = parseCustomEvmNetworkForm(baseValues);

				expect(withIcon).toEqual({
					ok: true,
					input: expect.objectContaining({ iconUrl: 'https://op.example/logo.png' })
				});
				// `iconUrl` absent from the input (not present-but-undefined) so
				// downstream consumers that distinguish "field missing" from
				// "field === undefined" see a clean object.
				expect(withoutIcon.ok && 'iconUrl' in withoutIcon.input).toBeFalsy();
			});

			it('trims whitespace from string fields before validating', () => {
				// Users copy-paste URLs and RPC tokens; trailing whitespace is
				// the #1 reason "valid URL" checks fail. Trim first so the
				// schema never sees it.
				const result = parseCustomEvmNetworkForm({
					...baseValues,
					name: '  Optimism  ',
					rpcUrl: '\thttps://mainnet.optimism.io\n',
					iconUrl: '  https://op.example/logo.png  '
				});

				expect(result).toEqual({
					ok: true,
					input: expect.objectContaining({
						name: 'Optimism',
						rpcUrl: 'https://mainnet.optimism.io',
						iconUrl: 'https://op.example/logo.png'
					})
				});
			});
		});

		describe('required-field errors', () => {
			it('reports per-field required errors for every empty string', () => {
				const result = parseCustomEvmNetworkForm({
					name: '',
					chainId: '',
					rpcUrl: '',
					currencySymbol: '',
					explorerUrl: '',
					iconUrl: '',
					env: 'mainnet'
				});

				expect(result).toEqual({
					ok: false,
					errors: {
						name: 'Network name is required.',
						chainId: 'Chain ID is required.',
						rpcUrl: 'RPC URL is required.',
						currencySymbol: 'Currency symbol is required.',
						explorerUrl: 'Block explorer URL is required.'
					}
				});
			});

			it('treats whitespace-only strings as empty', () => {
				const result = parseCustomEvmNetworkForm({
					...baseValues,
					name: '   ',
					rpcUrl: '\t\t'
				});

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({
						name: 'Network name is required.',
						rpcUrl: 'RPC URL is required.'
					})
				});
			});
		});

		describe('chainId coercion', () => {
			it('rejects a non-numeric chainId with a helpful message', () => {
				const result = parseCustomEvmNetworkForm({ ...baseValues, chainId: 'abc' });

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ chainId: 'Chain ID must be a positive integer.' })
				});
			});

			it('rejects zero', () => {
				// Zero is not a real EVM chain ID and the store schema refuses it.
				// Caught here so the user sees a plain-English error instead of
				// a Zod-generated one.
				const result = parseCustomEvmNetworkForm({ ...baseValues, chainId: '0' });

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ chainId: 'Chain ID must be a positive integer.' })
				});
			});

			it('rejects a negative integer', () => {
				const result = parseCustomEvmNetworkForm({ ...baseValues, chainId: '-1' });

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ chainId: 'Chain ID must be a positive integer.' })
				});
			});

			it('rejects a decimal', () => {
				const result = parseCustomEvmNetworkForm({ ...baseValues, chainId: '10.5' });

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ chainId: 'Chain ID must be a positive integer.' })
				});
			});

			it('accepts arbitrarily large chainIds (bigint range)', () => {
				// EVM chain IDs are in practice ≤ 2^64 but we should not cap at
				// `Number.MAX_SAFE_INTEGER` — the store is already `bigint`.
				const big = '18446744073709551615'; // 2^64 - 1
				const result = parseCustomEvmNetworkForm({ ...baseValues, chainId: big });

				expect(result).toEqual({
					ok: true,
					input: expect.objectContaining({ chainId: BigInt(big) })
				});
			});
		});

		describe('schema-level validation', () => {
			it('rejects a non-https RPC URL', () => {
				const result = parseCustomEvmNetworkForm({
					...baseValues,
					rpcUrl: 'http://insecure.example'
				});

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ rpcUrl: expect.any(String) })
				});
			});

			it('rejects a malformed explorer URL', () => {
				const result = parseCustomEvmNetworkForm({
					...baseValues,
					explorerUrl: 'not-a-url'
				});

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ explorerUrl: expect.any(String) })
				});
			});

			it('rejects a malformed iconUrl when provided', () => {
				const result = parseCustomEvmNetworkForm({
					...baseValues,
					iconUrl: 'not-a-url'
				});

				expect(result).toEqual({
					ok: false,
					errors: expect.objectContaining({ iconUrl: expect.any(String) })
				});
			});
		});
	});

	describe('verifyCustomEvmNetworkForm', () => {
		it('short-circuits with status=invalid when the form fails to parse', async () => {
			const probe = vi.fn();

			const result = await verifyCustomEvmNetworkForm({
				values: { ...baseValues, chainId: '' },
				probe
			});

			expect(result.status).toBe('invalid');
			// The probe must not fire when the form already fails client-side
			// validation — it would hit the network for nothing and could
			// surface a confusing "unreachable" on top of a form error.
			expect(probe).not.toHaveBeenCalled();
		});

		it('returns status=verified with the parsed input when the probe matches', async () => {
			const probe = vi.fn().mockResolvedValue({ status: 'ok' });

			const result = await verifyCustomEvmNetworkForm({ values: baseValues, probe });

			expect(result.status).toBe('verified');
			expect(probe).toHaveBeenCalledExactlyOnceWith({
				rpcUrl: 'https://mainnet.optimism.io',
				expectedChainId: 10n
			});

			if (result.status === 'verified') {
				expect(result.input.chainId).toBe(10n);
			}
		});

		it('returns status=chain-mismatch with the actual chainId on a mismatch', async () => {
			const probe = vi.fn().mockResolvedValue({ status: 'mismatch', actualChainId: 137n });

			const result = await verifyCustomEvmNetworkForm({ values: baseValues, probe });

			expect(result.status).toBe('chain-mismatch');

			if (result.status === 'chain-mismatch') {
				expect(result.actualChainId).toBe(137n);
				expect(result.input.chainId).toBe(10n);
			}
		});

		it('returns status=rpc-unreachable with the probe error message', async () => {
			const probe = vi
				.fn()
				.mockResolvedValue({ status: 'unreachable', error: 'getaddrinfo ENOTFOUND' });

			const result = await verifyCustomEvmNetworkForm({ values: baseValues, probe });

			expect(result.status).toBe('rpc-unreachable');

			if (result.status === 'rpc-unreachable') {
				expect(result.error).toBe('getaddrinfo ENOTFOUND');
			}
		});
	});
});

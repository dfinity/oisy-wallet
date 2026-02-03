import {
	ApiError,
	InMemoryTokenStore,
	type ApiErrorPayload,
	type HealthResponse,
	type LogoutRequest,
	type LogoutResponse,
	type MeResponse,
	type RefreshRequest,
	type RefreshResponse,
	type RequestOptions,
	type SendOtpRequest,
	type SendOtpResponse,
	type Session,
	type StatusResponse,
	type TokenStore,
	type VerifyOtpRequest,
	type VerifyOtpResponse,
	type ZebecClientOptions
} from '$lib/types/zebec';

export class ZebecSuperappApiClient {
	readonly #baseUrl: string;
	readonly #fetchFn: typeof fetch;
	readonly #tokenStore: TokenStore;

	constructor(options: ZebecClientOptions) {
		this.#baseUrl = options.baseUrl.replace(/\/+$/, '');
		this.#fetchFn = options.fetchFn ?? fetch;
		this.#tokenStore = options.tokenStore ?? new InMemoryTokenStore();
	}

	// ---------- Token helpers ----------
	setTokens(tokens: { accessToken?: string | null; refreshToken?: string | null }): void {
		if (typeof tokens.accessToken !== 'undefined') {
			this.#tokenStore.setAccessToken(tokens.accessToken);
		}
		if (typeof tokens.refreshToken !== 'undefined') {
			this.#tokenStore.setRefreshToken(tokens.refreshToken);
		}
	}

	getAccessToken(): string | null {
		return this.#tokenStore.getAccessToken();
	}

	getRefreshToken(): string | null {
		return this.#tokenStore.getRefreshToken();
	}

	// ---------- Core request ----------
	private async request<TResponse, TBody = unknown>(
		opts: RequestOptions<TBody>
	): Promise<TResponse> {
		const url = `${this.#baseUrl}${opts.path}`;
		const headers: Record<string, string> = {
			Accept: 'application/json',
			...(opts.body ? { 'Content-Type': 'application/json' } : {}),
			...(opts.headers ?? {})
		};

		if (opts.auth) {
			const accessToken = this.#tokenStore.getAccessToken();
			if (!accessToken) {
				throw new ApiError('Missing access token', 401, {
					message: 'Missing access token',
					statusCode: 401
				});
			}
			headers.Authorization = `Bearer ${accessToken}`;
		}

		const res = await this.#fetchFn(url, {
			method: opts.method,
			headers,
			body: opts.body ? JSON.stringify(opts.body) : undefined,
			signal: opts.signal
		});

		const contentType = res.headers.get('content-type') ?? '';
		const isJson = contentType.includes('application/json');

		const parsed: unknown = isJson
			? await res.json().catch(() => null)
			: await res.text().catch(() => null);

		if (!res.ok) {
			const payload =
				parsed && typeof parsed === 'object' ? (parsed as ApiErrorPayload) : undefined;
			const msg =
				payload?.message ??
				(typeof parsed === 'string' && parsed.trim().length > 0
					? parsed
					: `Request failed with ${res.status}`);
			throw new ApiError(msg, res.status, payload);
		}

		return parsed as TResponse;
	}

	/** GET /health */
	health(signal?: AbortSignal): Promise<HealthResponse> {
		return this.request<HealthResponse>({
			method: 'GET',
			path: '/health',
			signal,
			auth: false
		});
	}

	/** POST /auth/otp/send */
	sendOtp(email: string, signal?: AbortSignal): Promise<SendOtpResponse> {
		const body: SendOtpRequest = { email };
		return this.request<SendOtpResponse, SendOtpRequest>({
			method: 'POST',
			path: '/auth/otp/send',
			body,
			signal,
			auth: false
		});
	}

	/**
	 * POST /auth/otp/verify
	 * On success, stores accessToken + refreshToken in the tokenStore.
	 */
	async verifyOtp(email: string, code: string, signal?: AbortSignal): Promise<VerifyOtpResponse> {
		const body: VerifyOtpRequest = { email, code };
		const resp = await this.request<VerifyOtpResponse, VerifyOtpRequest>({
			method: 'POST',
			path: '/auth/otp/verify',
			body,
			signal,
			auth: false
		});

		this.#tokenStore.setAccessToken(resp.accessToken);
		this.#tokenStore.setRefreshToken(resp.refreshToken);

		return resp;
	}

	/**
	 * POST /auth/refresh
	 * Uses provided refreshToken or stored refreshToken. Stores new accessToken (and refreshToken if rotated).
	 */
	async refresh(refreshToken?: string, signal?: AbortSignal): Promise<RefreshResponse> {
		const token = refreshToken ?? this.#tokenStore.getRefreshToken();
		if (!token) {
			throw new ApiError('Missing refresh token', 401, {
				message: 'Missing refresh token',
				statusCode: 401
			});
		}

		const body: RefreshRequest = { refreshToken: token };
		const resp = await this.request<RefreshResponse, RefreshRequest>({
			method: 'POST',
			path: '/auth/refresh',
			body,
			signal,
			auth: false
		});

		this.#tokenStore.setAccessToken(resp.accessToken);
		if (typeof resp.refreshToken === 'string') {
			this.#tokenStore.setRefreshToken(resp.refreshToken);
		}

		return resp;
	}

	/**
	 * POST /auth/logout
	 * If your backend requires Bearer auth for logout, keep auth:true (matches typical behaviour).
	 * Clears stored tokens on success.
	 */
	async logout(logoutAll = false, signal?: AbortSignal): Promise<LogoutResponse> {
		const body: LogoutRequest = { logoutAll };
		const resp = await this.request<LogoutResponse, LogoutRequest>({
			method: 'POST',
			path: '/auth/logout',
			body,
			signal,
			auth: true
		});

		this.#tokenStore.setAccessToken(null);
		this.#tokenStore.setRefreshToken(null);

		return resp;
	}

	/** GET /auth/me */
	me(signal?: AbortSignal): Promise<MeResponse> {
		return this.request<MeResponse>({
			method: 'GET',
			path: '/auth/me',
			signal,
			auth: true
		});
	}

	/** GET /auth/status */
	status(signal?: AbortSignal): Promise<StatusResponse> {
		return this.request<StatusResponse>({
			method: 'GET',
			path: '/auth/status',
			signal,
			auth: true
		});
	}

	/** GET /auth/sessions */
	sessions(signal?: AbortSignal): Promise<Session[]> {
		return this.request<Session[]>({
			method: 'GET',
			path: '/auth/sessions',
			signal,
			auth: true
		});
	}
}

const tokens = new InMemoryTokenStore();

const api = new ZebecSuperappApiClient({
	baseUrl: 'https://your-api-host.tld',
	tokenStore: tokens
});

// Step 1
await api.sendOtp('user@example.com');

// Step 2
const auth = await api.verifyOtp('user@example.com', '123456');

if (auth.nextStep === 'complete_profile') {
	// call PUT /auth/profiles (not in your snippet) once you have that endpoint spec
}

// Authenticated calls
const me = await api.me();
const sessions = await api.sessions();

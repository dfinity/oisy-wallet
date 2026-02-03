import {
	ApiError,
	type ApiErrorPayload,
	type CancelOrderResponse,
	type CarbonCardResponse,
	type CardDetailsResponse,
	type CardOrderResponse,
	type CardOrderStatusResponse,
	type CardProfileResponse,
	type CardStatusResponse,
	type CardTransactionsQuery,
	type CardTransactionsResponse,
	type CardsHealthResponse,
	type CardsProgramsResponse,
	type CardsSyncResponse,
	type ChainTransactionsResponse,
	type ChangePinRequest,
	type EncryptedPayload,
	type HealthResponse,
	type LogoutRequest,
	type LogoutResponse,
	type MeResponse,
	type PinResponse,
	type RefreshRequest,
	type RefreshResponse,
	type ReloadHistoryQuery,
	type ReloadHistoryResponse,
	type RequestOptions,
	type SendOtpRequest,
	type SendOtpResponse,
	type Session,
	type SilverCardsResponse,
	type StatusResponse,
	type TokenStore,
	type UpdateCardProfileRequest,
	type UpdateCardStatusResponse,
	type VerifyOtpRequest,
	type VerifyOtpResponse,
	type ZebecClientOptions
} from '$lib/types/zebec';

export class InMemoryTokenStore implements TokenStore {
	private accessToken: string | null = null;
	private refreshToken: string | null = null;

	getAccessToken(): string | null {
		return this.accessToken;
	}
	getRefreshToken(): string | null {
		return this.refreshToken;
	}
	setAccessToken(token: string | null): void {
		this.accessToken = token;
	}
	setRefreshToken(token: string | null): void {
		this.refreshToken = token;
	}
	hasValidAccessToken(): boolean {
		return this.getAccessToken() !== null;
	}
	noTokens(): boolean {
		return this.accessToken === null && this.refreshToken === null;
	}
}

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

	// ---------- Endpoint methods ----------
	private buildQuery(
		params?: Record<string, string | number | boolean | null | undefined>
	): string {
		if (!params) {
			return '';
		}
		const qs = new URLSearchParams();

		for (const [k, v] of Object.entries(params)) {
			if (v === null || typeof v === 'undefined') {
				continue;
			}
			qs.set(k, String(v));
		}

		const s = qs.toString();
		return s ? `?${s}` : '';
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

	// ---------- Cards ----------

	/** GET /cards/health */
	cardsHealth(signal?: AbortSignal): Promise<CardsHealthResponse> {
		return this.request<CardsHealthResponse>({
			method: 'GET',
			path: '/cards/health',
			signal,
			auth: false
		});
	}

	/** GET /cards/programs */
	cardsPrograms(signal?: AbortSignal): Promise<CardsProgramsResponse> {
		return this.request<CardsProgramsResponse>({
			method: 'GET',
			path: '/cards/programs',
			signal,
			auth: true
		});
	}

	/**
	 * POST /cards/order
	 * Docs say: body contains encrypted payload: { data: "iv:encryptedPayload" }
	 */
	cardsOrder(payload: EncryptedPayload, signal?: AbortSignal): Promise<CardOrderResponse> {
		return this.request<CardOrderResponse, EncryptedPayload>({
			method: 'POST',
			path: '/cards/order',
			body: payload,
			signal,
			auth: true
		});
	}

	/** GET /cards/order/{orderId}/status */
	cardsOrderStatus(orderId: string, signal?: AbortSignal): Promise<CardOrderStatusResponse> {
		return this.request<CardOrderStatusResponse>({
			method: 'GET',
			path: `/cards/order/${encodeURIComponent(orderId)}/status`,
			signal,
			auth: true
		});
	}

	/**
	 * POST /cards/sync
	 * Internal endpoint requiring X-API-Key header; expose apiKey param.
	 */
	cardsSync(
		payload: EncryptedPayload,
		apiKey: string,
		signal?: AbortSignal
	): Promise<CardsSyncResponse> {
		return this.request<CardsSyncResponse, EncryptedPayload>({
			method: 'POST',
			path: '/cards/sync',
			body: payload,
			signal,
			auth: false,
			headers: { 'X-API-Key': apiKey }
		});
	}

	/**
	 * POST /cards/order/{id}/cancel
	 * Admin endpoint requiring X-API-Key header.
	 */
	cardsCancelOrder(
		orderId: string,
		apiKey: string,
		signal?: AbortSignal
	): Promise<CancelOrderResponse> {
		return this.request<CancelOrderResponse>({
			method: 'POST',
			path: `/cards/order/${encodeURIComponent(orderId)}/cancel`,
			signal,
			auth: false,
			headers: { 'X-API-Key': apiKey }
		});
	}

	/** GET /cards/chain-transactions */
	cardsChainTransactions(
		query: CardTransactionsQuery = {},
		signal?: AbortSignal
	): Promise<ChainTransactionsResponse> {
		const path = `/cards/chain-transactions${this.buildQuery({
			page: query.page,
			take: query.take,
			status: query.status,
			cardType: query.cardType,
			chain: query.chain,
			startDate: query.startDate,
			endDate: query.endDate,
			order: query.order,
			term: query.term
		})}`;

		return this.request<ChainTransactionsResponse>({
			method: 'GET',
			path,
			signal,
			auth: true
		});
	}

	/** GET /cards/silver */
	cardsSilver(signal?: AbortSignal): Promise<SilverCardsResponse> {
		return this.request<SilverCardsResponse>({
			method: 'GET',
			path: '/cards/silver',
			signal,
			auth: true
		});
	}

	/** GET /cards/carbon (can be null if not found) */
	cardsCarbon(signal?: AbortSignal): Promise<CarbonCardResponse | null> {
		return this.request<CarbonCardResponse | null>({
			method: 'GET',
			path: '/cards/carbon',
			signal,
			auth: true
		});
	}

	/** GET /cards/reload-history */
	cardsReloadHistory(
		query: ReloadHistoryQuery = {},
		signal?: AbortSignal
	): Promise<ReloadHistoryResponse> {
		const path = `/cards/reload-history${this.buildQuery({
			order: query.order,
			page: query.page,
			take: query.take,
			q: query.q,
			startDate: query.startDate,
			endDate: query.endDate,
			term: query.term,
			status: query.status,
			cardId: query.cardId,
			userId: query.userId,
			chainName: query.chainName,
			transactionStatus: query.transactionStatus
		})}`;

		return this.request<ReloadHistoryResponse>({
			method: 'GET',
			path,
			signal,
			auth: true
		});
	}

	/** GET /cards/{id} */
	cardDetails(cardId: string, signal?: AbortSignal): Promise<CardDetailsResponse> {
		return this.request<CardDetailsResponse>({
			method: 'GET',
			path: `/cards/${encodeURIComponent(cardId)}`,
			signal,
			auth: true
		});
	}

	/** GET /cards/{id}/profile */
	cardProfile(cardId: string, signal?: AbortSignal): Promise<CardProfileResponse> {
		return this.request<CardProfileResponse>({
			method: 'GET',
			path: `/cards/${encodeURIComponent(cardId)}/profile`,
			signal,
			auth: true
		});
	}

	/** POST /cards/{id}/profile */
	updateCardProfile(
		cardId: string,
		body: UpdateCardProfileRequest,
		signal?: AbortSignal
	): Promise<CardProfileResponse> {
		return this.request<CardProfileResponse, UpdateCardProfileRequest>({
			method: 'POST',
			path: `/cards/${encodeURIComponent(cardId)}/profile`,
			body,
			signal,
			auth: true
		});
	}

	/** GET /cards/{id}/pin */
	cardPin(cardId: string, signal?: AbortSignal): Promise<PinResponse> {
		return this.request<PinResponse>({
			method: 'GET',
			path: `/cards/${encodeURIComponent(cardId)}/pin`,
			signal,
			auth: true
		});
	}

	/** POST /cards/{id}/pin/change */
	changeCardPin(
		cardId: string,
		newPIN: string,
		signal?: AbortSignal
	): Promise<Record<string, never>> {
		const body: ChangePinRequest = { newPIN };
		return this.request<Record<string, never>, ChangePinRequest>({
			method: 'POST',
			path: `/cards/${encodeURIComponent(cardId)}/pin/change`,
			body,
			signal,
			auth: true
		});
	}

	/** GET /cards/{id}/status */
	cardStatus(cardId: string, signal?: AbortSignal): Promise<CardStatusResponse> {
		return this.request<CardStatusResponse>({
			method: 'GET',
			path: `/cards/${encodeURIComponent(cardId)}/status`,
			signal,
			auth: true
		});
	}

	/**
	 * POST /cards/{id}/status
	 * Docs don’t show request body; keep optional + flexible (send nothing by default).
	 */
	updateCardStatus(
		cardId: string,
		signal?: AbortSignal,
		body?: Record<string, unknown>
	): Promise<UpdateCardStatusResponse> {
		return this.request<UpdateCardStatusResponse, Record<string, unknown> | undefined>({
			method: 'POST',
			path: `/cards/${encodeURIComponent(cardId)}/status`,
			body,
			signal,
			auth: true
		});
	}

	/** GET /cards/{id}/transactions */
	cardTransactions<TItem = string>(
		cardId: string,
		query: CardTransactionsQuery = {},
		signal?: AbortSignal
	): Promise<CardTransactionsResponse<TItem>> {
		const path = `/cards/${encodeURIComponent(cardId)}/transactions${this.buildQuery({
			page: query.page,
			take: query.take,
			status: query.status,
			cardType: query.cardType,
			chain: query.chain,
			startDate: query.startDate,
			endDate: query.endDate,
			order: query.order,
			term: query.term
		})}`;

		return this.request<CardTransactionsResponse<TItem>>({
			method: 'GET',
			path,
			signal,
			auth: true
		});
	}
}

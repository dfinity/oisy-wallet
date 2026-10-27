import XCTest

@testable import App

@MainActor
final class BrowserTests: XCTestCase {
  private let account = BrowserAccount(
    principal: "test-principal", address: "0x" + String(repeating: "1", count: 40),
    expiresAt: .now.addingTimeInterval(3600))
  private func origin(_ text: String = "https://app.uniswap.org") -> BrowserOrigin {
    BrowserOrigin(url: URL(string: text)!)!
  }
  private func router() -> BrowserProvider {
    let defaults = UserDefaults(suiteName: "oisy.browser.tests.\(UUID())")!
    let provider = BrowserProvider(
      store: BrowserGrantStore(defaults: defaults), read: { _, _ in .string("0x123") })
    provider.updateAccount(account)
    provider.navigate(to: origin())
    return provider
  }
  private func request(
    _ provider: BrowserProvider, _ method: String, _ params: BrowserJSON = .array([])
  ) async throws -> BrowserJSON {
    try await provider.request(
      method: method, params: params, origin: provider.origin!, document: provider.document)
  }
  private func failure(
    _ code: Int, _ operation: () async throws -> BrowserJSON, file: StaticString = #filePath,
    line: UInt = #line
  ) async {
    do {
      _ = try await operation()
      XCTFail("Expected RPC error", file: file, line: line)
    } catch let error as BrowserRPCError {
      XCTAssertEqual(error.code, code, file: file, line: line)
    } catch { XCTFail("Unexpected error: \(error)", file: file, line: line) }
  }
  private func pending(_ provider: BrowserProvider) async throws {
    for _ in 0..<100 {
      if provider.pending != nil { return }
      try await Task.sleep(for: .milliseconds(10))
    }
    XCTFail("No pending consent")
  }
  func testCanonicalOriginsAndURLValidation() {
    XCTAssertEqual(origin("https://APP.UNISWAP.ORG:443/path?q=1#hash"), origin())
    XCTAssertNotEqual(origin("https://app.uniswap.org:8443"), origin())
    XCTAssertEqual(
      BrowserOrigin.website(" app.uniswap.org ")?.absoluteString, "https://app.uniswap.org")
    for text in [
      "http://app.uniswap.org", "https://user:password@app.uniswap.org", "file:///tmp/page",
      "javascript:alert(1)", "hello world",
    ] {
      XCTAssertNil(BrowserOrigin.website(text), text)
    }
  }
  func testNoAccountsBeforeConsentAndExplicitRejection() async throws {
    let provider = router()
    let accounts = try await request(provider, "eth_accounts")
    XCTAssertEqual(accounts, .array([]))
    let task = Task { try await request(provider, "eth_requestAccounts") }
    try await pending(provider)
    XCTAssertEqual(provider.pending?.origin, origin())
    provider.reject()
    await failure(4001) { try await task.value }
    XCTAssertFalse(provider.connected)
  }
  func testConsentPermissionsRevocationAndEvents() async throws {
    let provider = router()
    var events: [[String]] = []
    provider.accountsChanged = { events.append($0) }
    let params: BrowserJSON = .array([.object(["eth_accounts": .object([:])])])
    let task = Task { try await request(provider, "wallet_requestPermissions", params) }
    try await pending(provider)
    provider.approve()
    let permissions = try await task.value
    XCTAssertEqual(permissions.array?.first?.object?["parentCapability"], .string("eth_accounts"))
    XCTAssertEqual(permissions.array?.first?.object?["invoker"], .string(origin().value))
    let accounts = try await request(provider, "eth_requestAccounts")
    XCTAssertEqual(accounts, .array([.string(account.address)]))
    XCTAssertNil(provider.pending)
    _ = try await request(provider, "wallet_revokePermissions", params)
    XCTAssertFalse(provider.connected)
    XCTAssertEqual(events, [[account.address], []])
  }
  func testOnlyOnePromptAndNavigationCancelsIt() async throws {
    let provider = router()
    let task = Task { try await request(provider, "eth_requestAccounts") }
    try await pending(provider)
    await failure(-32002) { try await self.request(provider, "eth_requestAccounts") }
    provider.navigate(to: origin("https://1inch.com"))
    await failure(4001) { try await task.value }
    provider.approve()
    XCTAssertFalse(provider.connected)
  }
  func testForgedOriginAndStaleDocumentCannotRequest() async {
    let provider = router()
    let old = provider.document
    provider.navigate(to: origin())
    await failure(4900) {
      try await provider.request(
        method: "eth_requestAccounts", origin: self.origin(), document: old)
    }
    await failure(4900) {
      try await provider.request(
        method: "eth_accounts", origin: self.origin("https://evil.example"),
        document: provider.document)
    }
    XCTAssertNil(provider.pending)
  }
  func testGrantsAreScopedPersistedAndClearedOnSignOut() async throws {
    let defaults = UserDefaults(suiteName: "oisy.browser.tests.\(UUID())")!
    let store = BrowserGrantStore(defaults: defaults)
    let provider = BrowserProvider(store: store)
    provider.updateAccount(account)
    provider.navigate(to: origin())
    let task = Task { try await request(provider, "eth_requestAccounts") }
    try await pending(provider)
    provider.approve()
    _ = try await task.value
    XCTAssertEqual(store.origins(for: account.principal), [origin().value])
    provider.navigate(to: origin("https://1inch.com"))
    XCTAssertFalse(provider.connected)
    let restored = BrowserProvider(store: store)
    restored.updateAccount(account)
    restored.navigate(to: origin())
    XCTAssertTrue(restored.connected)
    restored.updateAccount(nil)
    XCTAssertTrue(store.origins(for: account.principal).isEmpty)
    XCTAssertFalse(restored.connected)
  }
  func testSignedOutStartupClearsPersistedGrantsBeforeAnAccountIsLoaded() throws {
    let name = "oisy.browser.cold-expiry.\(UUID())"
    let defaults = try XCTUnwrap(UserDefaults(suiteName: name))
    defer { defaults.removePersistentDomain(forName: name) }
    let store = BrowserGrantStore(defaults: defaults)
    store.set([origin().value], for: account.principal)
    let provider = BrowserProvider(store: store)
    XCTAssertNil(provider.account)
    provider.revokeAll()
    provider.updateAccount(account)
    provider.navigate(to: origin())
    XCTAssertFalse(provider.connected)
    XCTAssertTrue(store.origins(for: account.principal).isEmpty)
  }

  func testAccountChangeAndExpiryInvalidatePendingConsent() async throws {
    let provider = router()
    let task = Task { try await request(provider, "eth_requestAccounts") }
    try await pending(provider)
    provider.updateAccount(
      BrowserAccount(principal: "other", address: account.address, expiresAt: account.expiresAt))
    await failure(4001) { try await task.value }
    XCTAssertFalse(provider.connected)
    provider.updateAccount(
      BrowserAccount(
        principal: account.principal, address: account.address, expiresAt: .distantPast))
    await failure(4100) { try await self.request(provider, "eth_requestAccounts") }
    provider.updateAccount(nil)
    await failure(4100) { try await self.request(provider, "eth_requestAccounts") }
  }
  func testAccountMenuRevokesAnInactiveOriginWithoutDisconnectingCurrentApp() async throws {
    let defaults = UserDefaults(suiteName: "oisy.browser.tests.\(UUID())")!
    let store = BrowserGrantStore(defaults: defaults)
    let first = origin()
    let second = origin("https://1inch.com")
    store.set([first.value, second.value], for: account.principal)
    let provider = BrowserProvider(store: store)
    provider.updateAccount(account)
    provider.navigate(to: second)
    var events: [[String]] = []
    provider.accountsChanged = { events.append($0) }
    provider.revoke(origin: first.value)
    XCTAssertEqual(provider.grants, [second.value])
    XCTAssertEqual(store.origins(for: account.principal), [second.value])
    XCTAssertTrue(provider.connected)
    XCTAssertTrue(events.isEmpty)
    provider.revoke(origin: second.value)
    XCTAssertTrue(provider.grants.isEmpty)
    XCTAssertTrue(store.origins(for: account.principal).isEmpty)
    XCTAssertFalse(provider.connected)
    XCTAssertEqual(events, [[]])
    let accounts = try await request(provider, "eth_accounts")
    XCTAssertEqual(accounts, .array([]))
    provider.revoke(origin: second.value)
    XCTAssertEqual(events, [[]])
  }

  func testFixedChainAndReadAllowlistNeverDispatchSigning() async throws {
    let provider = router()
    let chain = try await request(provider, "eth_chainId")
    XCTAssertEqual(chain, .string("0xaa36a7"))
    let block = try await request(provider, "eth_blockNumber")
    XCTAssertEqual(block, .string("0x123"))
    _ = try await request(
      provider, "wallet_switchEthereumChain", .array([.object(["chainId": .string("0xaa36a7")])]))
    await failure(4902) {
      try await self.request(
        provider, "wallet_switchEthereumChain", .array([.object(["chainId": .string("0x1")])]))
    }
    for method in [
      "eth_sendTransaction", "eth_sendRawTransaction", "personal_sign", "eth_sign",
      "eth_signTypedData_v4", "wallet_addEthereumChain", "wallet_sendCalls",
    ] {
      await failure(4200) { try await self.request(provider, method) }
    }
    await failure(-32602) { try await self.request(provider, "eth_getBalance", .string("bad")) }
    await failure(-32602) {
      try await self.request(
        provider, "wallet_requestPermissions", .array([.object(["eth_accounts": .bool(true)])]))
    }
  }
}

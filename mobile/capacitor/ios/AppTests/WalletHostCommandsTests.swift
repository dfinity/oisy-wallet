import CryptoKit
import XCTest

@testable import App

@MainActor final class WalletHostCommandsTests: XCTestCase {
  private func makeHost() throws -> (ShellViewController, WalletHostCommands) {
    let store = TestAuthStore()
    try store.save(fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600)))
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript = "window.fetch = () => new Promise(() => {});"
    shell.loadViewIfNeeded()
    let commands = WalletHostCommands()
    commands.host = shell
    return (shell, commands)
  }
  func testHandshakeBindsCommandsAndRejectsOldDocumentLogout() async throws {
    let (shell, commands) = try makeHost()
    defer {
      shell.auth.signOut()
      shell.resume()
    }
    let session = try XCTUnwrap(shell.wallet?.session)
    let ready = try await commands.execute(method: "ready", options: ["version": 2])
    XCTAssertEqual(ready.value["documentId"] as? String, session.documentID.uuidString)
    XCTAssertEqual(ready.value["environment"] as? String, "audit")
    let old = session.documentID
    session.resetDocument()
    for token in [old.uuidString, "", UUID().uuidString] {
      do {
        _ = try await commands.execute(
          method: "wallet",
          options: [
            "version": 2, "documentId": token, "request": ["method": "signOut"],
          ])
        XCTFail("Stale document must not sign out the new document")
      } catch { XCTAssertNotNil(shell.auth.session) }
    }
    let reply = try await commands.execute(
      method: "wallet",
      options: [
        "version": 2, "documentId": session.documentID.uuidString, "request": ["method": "signOut"],
      ])
    XCTAssertNotNil(shell.auth.session, "Reply must be delivered before the WebView is removed")
    reply.afterDelivery?()
    XCTAssertNil(shell.auth.session)
  }
  func testPendingGrantReplyCannotCrossDocumentReplacement() async throws {
    var finish: CheckedContinuation<WebDelegation, Error>?
    var issued: WebDelegation?
    let fixture = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    let held = AuthSession(id: UUID(), principal: fixture.principal, expiresAt: fixture.expiresAt) {
      key in
      issued = try await fixture.delegate(key)
      return try await withCheckedThrowingContinuation { continuation in
        finish = continuation
      }
    }
    let store = TestAuthStore()
    try store.save(held)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript = "window.fetch = () => new Promise(() => {});"
    shell.loadViewIfNeeded()
    defer {
      shell.auth.signOut()
      shell.resume()
    }
    let commands = WalletHostCommands()
    commands.host = shell
    let session = try XCTUnwrap(shell.wallet?.session)
    let options: [AnyHashable: Any] = [
      "version": 2, "documentId": session.documentID.uuidString,
      "request": [
        "method": "authorize",
        "publicKey": P256.Signing.PrivateKey().publicKey.derRepresentation.base64EncodedString(),
      ],
    ]
    let request = Task { try await commands.execute(method: "wallet", options: options) }
    for _ in 0..<500 where finish == nil { await Task.yield() }
    let continuation = try XCTUnwrap(finish)
    let grant = try XCTUnwrap(issued)
    session.resetDocument()
    continuation.resume(returning: grant)
    do {
      _ = try await request.value
      XCTFail("Late response accepted")
    } catch {}
    XCTAssertNil(session.grant)
  }
}

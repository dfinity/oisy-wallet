@preconcurrency import Capacitor
import WebKit

/// Capacitor transport only. WalletHostCommands owns the validated native operations.
@objc(OisyHostPlugin)
final class OisyHostPlugin: CAPPlugin, CAPBridgedPlugin, @unchecked Sendable {
  let identifier = "OisyHostPlugin"
  let jsName = "OisyHost"
  let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "ready", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "navigate", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "navigationState", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "prepareBack", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "clearBack", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "finishRefresh", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "presentation", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "openAccount", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "wallet", returnType: CAPPluginReturnPromise),
  ]
  @MainActor private lazy var commands = WalletHostCommands()
  @MainActor var host: ShellViewController? {
    get { commands.host }
    set { commands.host = newValue }
  }
  @objc func ready(_ call: CAPPluginCall) { dispatch("ready", call: call) }
  @objc func navigate(_ call: CAPPluginCall) { dispatch("navigate", call: call) }
  @objc func navigationState(_ call: CAPPluginCall) { dispatch("navigationState", call: call) }
  @objc func prepareBack(_ call: CAPPluginCall) { dispatch("prepareBack", call: call) }
  @objc func clearBack(_ call: CAPPluginCall) { dispatch("clearBack", call: call) }
  @objc func finishRefresh(_ call: CAPPluginCall) { dispatch("finishRefresh", call: call) }
  @objc func presentation(_ call: CAPPluginCall) { dispatch("presentation", call: call) }
  @objc func openAccount(_ call: CAPPluginCall) { dispatch("openAccount", call: call) }
  @objc func wallet(_ call: CAPPluginCall) { dispatch("wallet", call: call) }

  private func dispatch(_ method: String, call: CAPPluginCall) {
    Task { @MainActor [weak self] in
      guard let self, let wallet = self.host?.wallet, wallet.hostPlugin === self,
        WalletOriginPolicy.accepts(self.bridge?.webView?.url, mainFrame: true)
      else {
        call.reject("Unsupported host request")
        return
      }
      do {
        let result = try await self.commands.execute(method: method, options: call.options)
        call.resolve(result.value)
        result.afterDelivery?()
      } catch OperationJournalError.conflict {
        call.reject("Operation journal changed", "OPERATION_JOURNAL_CONFLICT")
      } catch {
        call.reject("Unsupported or stale host request")
      }
    }
  }
  @MainActor private func event(_ name: String, values: [String: Any] = [:]) {
    guard let wallet = host?.wallet, !wallet.session.checkExpiration() else { return }
    notifyListeners(
      name,
      data: values.merging([
        "version": 2, "documentId": wallet.session.documentID.uuidString,
      ]) { _, current in current })
  }
  @MainActor func returnToParent() {
    guard host?.walletInteractionsAllowed == true else { return }
    event("back")
  }
  @MainActor func refresh(requestID: Int) {
    guard host?.walletInteractionsAllowed == true, host?.walletRoot == .wallet else { return }
    event("refresh", values: ["requestId": requestID])
  }
  @MainActor func select(_ root: String) { host?.requestWebScreen(root) }
  @MainActor func select(_ root: String, requestID: Int) {
    event("navigate", values: ["root": root, "requestId": requestID])
  }
  override func shouldOverrideLoad(_ action: WKNavigationAction) -> NSNumber? {
    MainActor.assumeIsolated {
      guard let wallet = host?.wallet, wallet.hostPlugin === self else { return true }
      if WalletOriginPolicy.accepts(
        action.request.url, mainFrame: action.targetFrame?.isMainFrame == true)
      {
        host?.setBlockingPresentation(false)
        host?.resetNavigationForDocument()
        wallet.session.resetDocument()
        return wallet.session.isActive ? nil : true
      }
      if action.navigationType == .linkActivated, action.sourceFrame.isMainFrame,
        let url = action.request.url, url.scheme == "https", url.host != nil,
        url.user == nil, url.password == nil
      {
        UIApplication.shared.open(url)
      }
      return true
    }
  }
}

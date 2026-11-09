import UIKit
import WebKit

/// UIKit owns presentation; the existing trusted WebView keeps its document,
/// workers and session. No second wallet WebView or authentication handoff.
@MainActor
final class WalletSheetCoordinator: NSObject, UISheetPresentationControllerDelegate {
  enum Size: String { case medium, large }
  private weak var owner: TrustedWalletViewController?
  private weak var webView: WKWebView?
  private(set) var identifier: UUID?
  private(set) var controller: UIViewController?
  private var backgroundSnapshot: UIImageView?
  private var dismissing = false

  init(owner: TrustedWalletViewController, webView: WKWebView) {
    self.owner = owner
    self.webView = webView
  }

  func prepare(id: UUID) async throws {
    guard identifier == nil, let owner, owner.isReady, owner.view.window != nil,
      !owner.view.isHidden, owner.presentedViewController == nil,
      owner.hostPlugin.host?.presentedViewController == nil, let webView
    else { throw WalletHostCommandError.unavailable }
    identifier = id
    owner.hostPlugin.host?.updateNavigationVisibility()
    do {
      let image = try await webView.takeSnapshot(configuration: nil)
      guard identifier == id, owner.isReady, owner.session.isActive, !owner.view.isHidden,
        owner.hostPlugin.host?.presentedViewController == nil
      else {
        throw WalletHostCommandError.unavailable
      }
      let snapshot = UIImageView(image: image)
      snapshot.contentMode = .scaleToFill
      snapshot.isUserInteractionEnabled = true
      snapshot.accessibilityElementsHidden = true
      snapshot.translatesAutoresizingMaskIntoConstraints = false
      owner.view.addSubview(snapshot)
      NSLayoutConstraint.activate([
        snapshot.leadingAnchor.constraint(equalTo: owner.view.leadingAnchor),
        snapshot.trailingAnchor.constraint(equalTo: owner.view.trailingAnchor),
        snapshot.topAnchor.constraint(equalTo: owner.view.topAnchor),
        snapshot.bottomAnchor.constraint(equalTo: owner.view.bottomAnchor),
      ])
      backgroundSnapshot = snapshot
    } catch {
      if identifier == id { reset() }
      throw error
    }
  }

  func present(id: UUID, size: Size) async throws {
    guard identifier == id, !dismissing, let owner, owner.isReady,
      owner.session.isActive, backgroundSnapshot != nil
    else { throw WalletHostCommandError.unavailable }
    if let controller {
      if size == .large {
        controller.sheetPresentationController?.animateChanges {
          controller.sheetPresentationController?.selectedDetentIdentifier = .large
        }
      }
      return
    }
    guard !owner.view.isHidden, owner.presentedViewController == nil,
      owner.hostPlugin.host?.presentedViewController == nil
    else {
      reset()
      throw WalletHostCommandError.unavailable
    }
    let panel = UIViewController()
    panel.modalPresentationStyle = .pageSheet
    panel.isModalInPresentation = true
    panel.view.backgroundColor = .systemBackground
    panel.view.accessibilityIdentifier = "wallet.nativeSheet"
    if let sheet = panel.sheetPresentationController {
      sheet.detents = size == .medium ? [.medium(), .large()] : [.large()]
      sheet.selectedDetentIdentifier = size == .medium ? .medium : .large
      sheet.prefersGrabberVisible = true
      sheet.prefersScrollingExpandsWhenScrolledToEdge = true
      sheet.prefersEdgeAttachedInCompactHeight = true
      sheet.widthFollowsPreferredContentSizeWhenEdgeAttached = true
      sheet.delegate = self
    }
    controller = panel
    owner.moveWebView(to: panel.view)
    await withCheckedContinuation { continuation in
      owner.present(panel, animated: !UIAccessibility.isReduceMotionEnabled) {
        continuation.resume()
      }
    }
    guard identifier == id, owner.session.isActive else {
      throw WalletHostCommandError.unavailable
    }
  }

  // Called at the web panel's outro start. Freeze its last rendered content so
  // removing the web dialog cannot reveal Wallet inside the departing sheet.
  func dismiss(id: UUID) async throws {
    guard identifier == id else { throw WalletHostCommandError.invalid }
    guard !dismissing else { return }
    dismissing = true
    guard let panel = controller, let webView else { return }
    let configuration = WKSnapshotConfiguration()
    configuration.afterScreenUpdates = false
    let image = try? await webView.takeSnapshot(configuration: configuration)
    guard identifier == id, controller === panel else {
      throw WalletHostCommandError.unavailable
    }
    if let image {
      let snapshot = UIImageView(image: image)
      snapshot.frame = webView.frame
      snapshot.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      snapshot.accessibilityElementsHidden = true
      panel.view.addSubview(snapshot)
    }
    if panel.presentingViewController != nil {
      await withCheckedContinuation { continuation in
        panel.dismiss(animated: !UIAccessibility.isReduceMotionEnabled) {
          continuation.resume()
        }
      }
    }
  }

  // The web panel has now unmounted. Returning the same view doesn't reload it.
  func release(id: UUID) async throws {
    guard identifier == id else { throw WalletHostCommandError.invalid }
    if let panel = controller, panel.presentingViewController != nil {
      await withCheckedContinuation { continuation in
        panel.dismiss(animated: false) { continuation.resume() }
      }
    }
    if identifier == id { reset() }
  }

  func reset() {
    guard identifier != nil || controller != nil || backgroundSnapshot != nil else { return }
    identifier = nil
    dismissing = false
    let panel = controller
    controller = nil
    if let owner {
      owner.moveWebView(to: owner.view)
      owner.view.layoutIfNeeded()
    }
    backgroundSnapshot?.removeFromSuperview()
    backgroundSnapshot = nil
    panel?.dismiss(animated: false)
    owner?.hostPlugin.host?.updateNavigationVisibility()
  }

  func presentationControllerShouldDismiss(_ presentationController: UIPresentationController)
    -> Bool
  {
    // A gesture is a request, not permission to bypass the web flow's guards.
    false
  }
  func presentationControllerDidAttemptToDismiss(
    _ presentationController: UIPresentationController
  ) {
    guard !dismissing, presentationController.presentedViewController === controller,
      let identifier
    else { return }
    owner?.hostPlugin.dismissSheet(id: identifier)
  }
}

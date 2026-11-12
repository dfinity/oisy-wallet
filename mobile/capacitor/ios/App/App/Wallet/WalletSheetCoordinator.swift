import UIKit
import WebKit

/// UIKit owns presentation; the existing trusted WebView keeps its document,
/// workers and session. No second wallet WebView or authentication handoff.
@MainActor
final class WalletSheetCoordinator: NSObject, UISheetPresentationControllerDelegate,
  UIGestureRecognizerDelegate
{
  enum Size: String { case medium, large }
  private weak var owner: TrustedWalletViewController?
  private weak var webView: WKWebView?
  private(set) var identifier: UUID?
  private(set) var controller: UIViewController?
  private var backgroundSnapshot: UIImageView?
  private var backgroundTap: UITapGestureRecognizer?
  private var dismissing = false
  var hidesNavigation: Bool { identifier != nil && !dismissing }
  private var contentOffset: CGPoint?
  private(set) var contentHeight: Int?
  static let contentDetent = UISheetPresentationController.Detent.Identifier("content")

  init(owner: TrustedWalletViewController, webView: WKWebView) {
    self.owner = owner
    self.webView = webView
  }

  func prepare(id: UUID) async throws {
    guard identifier == nil, let owner, owner.isReady, owner.view.window != nil,
      !owner.view.isHidden, owner.presentedViewController == nil,
      owner.hostPlugin.host?.presentedViewController == nil, let webView
    else { throw WalletHostCommandError.unavailable }
    contentOffset = webView.scrollView.contentOffset
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
      snapshot.accessibilityIdentifier = "wallet.sheetBackground"
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

  func present(id: UUID, size: Size, contentHeight: Int? = nil) async throws {
    guard identifier == id, !dismissing, let owner, owner.isReady,
      owner.session.isActive, backgroundSnapshot != nil
    else { throw WalletHostCommandError.unavailable }
    if let controller {
      if let contentHeight {
        try resize(id: id, contentHeight: contentHeight)
      } else if size == .large {
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
    self.contentHeight = contentHeight
    let panel = WalletSheetViewController()
    panel.onDismiss = { [weak self] in self?.requestDismissal() }
    panel.modalPresentationStyle = .pageSheet
    panel.isModalInPresentation = true
    panel.view.backgroundColor = .systemBackground
    panel.view.accessibilityIdentifier = "wallet.nativeSheet"
    if let sheet = panel.sheetPresentationController {
      if contentHeight != nil {
        sheet.detents = [
          .custom(identifier: Self.contentDetent) { [weak self] context in
            min(CGFloat(max(140, self?.contentHeight ?? 140)), context.maximumDetentValue)
          }
        ]
        sheet.selectedDetentIdentifier = Self.contentDetent
      } else {
        sheet.detents = size == .medium ? [.medium(), .large()] : [.large()]
        sheet.selectedDetentIdentifier = size == .medium ? .medium : .large
      }
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
    // UIKit blocks outside taps while isModalInPresentation is true. Keep that
    // guard and forward background taps to the web flow's own Close callback.
    if let container = panel.presentationController?.containerView {
      let tap = UITapGestureRecognizer(target: self, action: #selector(backgroundTapped(_:)))
      tap.name = "wallet.sheetBackgroundTap"
      tap.delegate = self
      container.addGestureRecognizer(tap)
      backgroundTap = tap
    }
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch)
    -> Bool
  {
    guard gestureRecognizer === backgroundTap, !dismissing, owner?.isReady == true,
      owner?.session.isActive == true, let panel = controller,
      panel.presentedViewController == nil,
      let presentedView = panel.presentationController?.presentedView
    else { return false }
    // Include the system sheet chrome/grabber, not just the embedded WebView.
    return !presentedView.bounds.contains(touch.location(in: presentedView))
  }

  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    // UIKit also recognizes taps on its dimming view. Our filtered outside tap
    // must receive the same touch while automatic UIKit dismissal stays blocked.
    gestureRecognizer === backgroundTap
  }

  @objc private func backgroundTapped(_ gestureRecognizer: UITapGestureRecognizer) {
    guard gestureRecognizer === backgroundTap else { return }
    requestDismissal()
  }

  func resize(id: UUID, contentHeight: Int) throws {
    guard identifier == id, !dismissing, owner?.isReady == true,
      owner?.session.isActive == true, self.contentHeight != nil,
      let sheet = controller?.sheetPresentationController,
      (1...100_000).contains(contentHeight)
    else { throw WalletHostCommandError.unavailable }
    guard self.contentHeight != contentHeight else { return }
    self.contentHeight = contentHeight
    if UIAccessibility.isReduceMotionEnabled {
      sheet.invalidateDetents()
    } else {
      sheet.animateChanges { sheet.invalidateDetents() }
    }
  }

  private func requestDismissal() {
    guard !dismissing, let identifier, owner?.session.isActive == true else { return }
    owner?.hostPlugin.dismissSheet(id: identifier)
  }

  // Called at the web panel's outro start. Freeze its last rendered content so
  // removing the web dialog cannot reveal Wallet inside the departing sheet.
  func dismiss(id: UUID) async throws {
    guard identifier == id else { throw WalletHostCommandError.invalid }
    guard !dismissing else { return }
    dismissing = true
    owner?.hostPlugin.host?.updateNavigationVisibility()
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
    guard identifier == id, let webView else { return }
    restoreWebView()
    // Reparenting changes WebKit's viewport and env(safe-area-inset-*).
    // Keep the original page image until WebKit has painted the restored layout.
    // A one-point snapshot is a rendering fence, not another retained screenshot.
    let configuration = WKSnapshotConfiguration()
    configuration.rect = CGRect(x: 0, y: 0, width: 1, height: 1)
    configuration.afterScreenUpdates = true
    _ = try? await webView.takeSnapshot(configuration: configuration)
    if identifier == id { reset() }
  }

  private func restoreWebView() {
    guard let owner, let webView, webView.superview !== owner.view else { return }
    owner.moveWebView(to: owner.view)
    owner.view.layoutIfNeeded()
    if let contentOffset {
      webView.scrollView.setContentOffset(contentOffset, animated: false)
    }
  }

  func reset() {
    guard identifier != nil || controller != nil || backgroundSnapshot != nil else { return }
    if let backgroundTap { backgroundTap.view?.removeGestureRecognizer(backgroundTap) }
    backgroundTap = nil
    identifier = nil
    dismissing = false
    let panel = controller
    controller = nil
    contentHeight = nil
    restoreWebView()
    contentOffset = nil
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
    guard presentationController.presentedViewController === controller else { return }
    requestDismissal()
  }
}

/// VoiceOver's escape gesture follows the same guarded dismissal as the grabber.
@MainActor
private final class WalletSheetViewController: UIViewController {
  var onDismiss: (() -> Void)?
  override func accessibilityPerformEscape() -> Bool {
    onDismiss?()
    return true
  }
}

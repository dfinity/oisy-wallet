import UIKit
import WebKit

/// A parent image lives only in memory. The trusted WebView remains the single
/// live wallet during a gesture; WebKit's SPA history screenshots are not used.
@MainActor
final class WalletInteractions: NSObject, UIGestureRecognizerDelegate {
  private weak var webView: WKWebView?
  private let onBack: () -> Void
  private let onRefresh: (Int) -> Void
  private let haptic: () -> Void
  private let snapshot: (@escaping @MainActor (UIImage?) -> Void) -> Void
  private(set) var parentURL: URL?
  private var parentImage: UIImage?
  private var capturedSize = CGSize.zero
  private var capturedStyle = UIUserInterfaceStyle.unspecified
  private var captureID = UUID()
  private var captureCompletion: ((Bool) -> Void)?
  private var captureTimeout: Task<Void, Never>?
  private var returnTimeout: Task<Void, Never>?
  private var refreshTimeout: Task<Void, Never>?
  private var underlay: UIImageView?
  private var transitionID = UUID()
  private(set) var isDragging = false
  private(set) var awaitingBack = false
  private var backAllowed = false
  private var refreshAllowed = false
  private var nextRefreshID = 0
  private(set) var refreshRequestID: Int?
  let refreshControl = UIRefreshControl()
  let refreshFeedback = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
  let refreshIndicator = UIActivityIndicatorView(style: .medium)
  let edgePan = UIScreenEdgePanGestureRecognizer()

  init(
    webView: WKWebView, onBack: @escaping () -> Void,
    onRefresh: @escaping (Int) -> Void,
    haptic: @escaping () -> Void = {
      UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.55)
    }, snapshot: ((@escaping @MainActor (UIImage?) -> Void) -> Void)? = nil
  ) {
    self.webView = webView
    self.onBack = onBack
    self.onRefresh = onRefresh
    self.haptic = haptic
    self.snapshot =
      snapshot ?? { [weak webView] completion in
        guard let webView else {
          completion(nil)
          return
        }
        let configuration = WKSnapshotConfiguration()
        configuration.afterScreenUpdates = true
        webView.takeSnapshot(with: configuration) { image, _ in
          completion(image)
        }
      }
    super.init()
    edgePan.edges = .left
    edgePan.delegate = self
    edgePan.addTarget(self, action: #selector(handlePan))
    // Keep the gesture on the container while its live WebView moves underneath
    // the native navigation controls.
    webView.superview?.addGestureRecognizer(edgePan)
    webView.scrollView.panGestureRecognizer.require(toFail: edgePan)
    // The document owns its safe-area padding; the native scroll view starts at
    // the screen edge. Keep the gesture threshold, but draw feedback below the
    // status bar instead of letting WebKit hide the stock spinner behind it.
    refreshControl.alpha = 0
    refreshControl.accessibilityElementsHidden = true
    refreshFeedback.isHidden = true
    refreshFeedback.isUserInteractionEnabled = false
    refreshFeedback.isAccessibilityElement = true
    refreshFeedback.accessibilityLabel = NSLocalizedString("wallet.refreshing", comment: "")
    refreshFeedback.accessibilityTraits = .updatesFrequently
    refreshFeedback.layer.cornerRadius = 22
    refreshFeedback.clipsToBounds = true
    refreshFeedback.translatesAutoresizingMaskIntoConstraints = false
    refreshIndicator.color = .label
    refreshIndicator.translatesAutoresizingMaskIntoConstraints = false
    refreshFeedback.contentView.addSubview(refreshIndicator)
    NSLayoutConstraint.activate([
      refreshIndicator.centerXAnchor.constraint(equalTo: refreshFeedback.contentView.centerXAnchor),
      refreshIndicator.centerYAnchor.constraint(equalTo: refreshFeedback.contentView.centerYAnchor),
    ])
    webView.scrollView.panGestureRecognizer.addTarget(
      self, action: #selector(updateRefreshFeedback))
    refreshControl.addTarget(self, action: #selector(requestRefresh), for: .valueChanged)
    webView.scrollView.refreshControl = refreshControl
    update(backAllowed: false, refreshAllowed: false)
  }

  var canBeginBack: Bool {
    backAllowed && parentImage != nil && underlay == nil && !isDragging && !awaitingBack
      && geometryMatches && webView?.superview != nil
  }
  private var geometryMatches: Bool {
    guard let webView else { return false }
    return webView.bounds.size == capturedSize
      && webView.traitCollection.userInterfaceStyle == capturedStyle
  }
  func capture(parent: URL, completion: @escaping (Bool) -> Void) {
    clearBack()
    guard let webView, webView.bounds.width > 0, webView.bounds.height > 0 else {
      completion(false)
      return
    }
    capturedSize = webView.bounds.size
    capturedStyle = webView.traitCollection.userInterfaceStyle
    captureCompletion = completion
    let id = captureID
    captureTimeout = Task { [weak self] in
      do { try await Task.sleep(for: .milliseconds(500)) } catch { return }
      guard let self, self.captureID == id else { return }
      self.clearBack()
    }
    snapshot { [weak self] image in
      guard let self, self.captureID == id, self.captureCompletion != nil else { return }
      guard let image, self.geometryMatches else {
        self.clearBack()
        return
      }
      self.parentImage = image
      self.parentURL = parent
      self.captureTimeout?.cancel()
      self.captureTimeout = nil
      let completion = self.captureCompletion
      self.captureCompletion = nil
      completion?(true)
    }
  }
  func update(backAllowed: Bool, refreshAllowed: Bool) {
    if edgePan.view == nil { webView?.superview?.addGestureRecognizer(edgePan) }
    self.backAllowed = backAllowed
    self.refreshAllowed = refreshAllowed
    webView?.allowsBackForwardNavigationGestures = false
    // Root refresh is the only place where the wallet can overscroll. WebKit
    // remembers the global client permission separately from UIKit axis values;
    // set it first so Capacitor's initial false does not win again on repaint.
    webView?.scrollView.bounces = refreshAllowed
    webView?.scrollView.bouncesVertically = refreshAllowed
    webView?.scrollView.bouncesHorizontally = false
    webView?.scrollView.alwaysBounceVertical = refreshAllowed
    refreshControl.isEnabled = refreshAllowed
    if !refreshAllowed { cancelRefresh() }
    if parentImage != nil && !geometryMatches { clearBack() }
  }
  func navigationCommitted(url: URL?) {
    if awaitingBack, url == parentURL {
      clearBack()
    } else if !WalletBackNavigationPolicy.isToken(url) && captureCompletion == nil {
      clearBack()
    }
  }
  func clearBack() {
    captureID = UUID()
    captureTimeout?.cancel()
    captureTimeout = nil
    let completion = captureCompletion
    captureCompletion = nil
    parentImage = nil
    parentURL = nil
    resetTransition()
    completion?(false)
  }
  func invalidate() {
    clearBack()
    cancelRefresh()
  }
  func close() {
    invalidate()
    edgePan.view?.removeGestureRecognizer(edgePan)
    webView?.scrollView.refreshControl = nil
    webView?.scrollView.panGestureRecognizer.removeTarget(
      self, action: #selector(updateRefreshFeedback))
    refreshFeedback.removeFromSuperview()
  }
  func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    let velocity = edgePan.velocity(in: edgePan.view)
    return canBeginBack && velocity.x > abs(velocity.y)
  }
  @objc private func handlePan() {
    guard let webView else { return }
    let width = webView.bounds.width
    guard width > 0 else {
      clearBack()
      return
    }
    let progress = min(1, max(0, edgePan.translation(in: edgePan.view).x / width))
    switch edgePan.state {
    case .began: beginBack()
    case .changed: updateBack(progress: progress)
    case .ended:
      endBack(
        commit: progress > 0.35 || (progress > 0.06 && edgePan.velocity(in: edgePan.view).x > 650))
    case .cancelled, .failed: endBack(commit: false)
    default: break
    }
  }
  /// Also exercised by the WebKit integration test without private input APIs.
  @discardableResult func beginBack() -> Bool {
    guard canBeginBack, let webView, let parentImage, let container = webView.superview else {
      return false
    }
    webView.endEditing(true)
    let image = UIImageView(image: parentImage)
    image.frame = webView.frame
    image.contentMode = .scaleToFill
    image.isUserInteractionEnabled = true
    image.accessibilityElementsHidden = true
    container.insertSubview(image, belowSubview: webView)
    underlay = image
    isDragging = true
    transitionID = UUID()
    updateBack(progress: 0)
    return true
  }
  func updateBack(progress: CGFloat) {
    guard isDragging, let webView else { return }
    let value = min(1, max(0, progress))
    webView.transform = CGAffineTransform(translationX: webView.bounds.width * value, y: 0)
    let depth: CGFloat = UIAccessibility.isReduceMotionEnabled ? 0 : 0.22
    underlay?.transform = CGAffineTransform(
      translationX: -webView.bounds.width * depth * (1 - value), y: 0)
  }
  func endBack(commit: Bool, animated: Bool = true) {
    guard isDragging, let webView else { return }
    isDragging = false
    let complete = commit && backAllowed && geometryMatches
    awaitingBack = complete
    let id = transitionID
    let duration = animated && !UIAccessibility.isReduceMotionEnabled ? 0.2 : 0
    let animate = {
      webView.transform =
        complete
        ? CGAffineTransform(translationX: webView.bounds.width, y: 0) : .identity
      self.underlay?.transform = .identity
    }
    if duration == 0 {
      animate()
      completeBack(id: id, commit: complete)
    } else {
      UIView.animate(
        withDuration: duration, delay: 0, options: [.curveEaseOut, .beginFromCurrentState],
        animations: animate
      ) { [weak self] _ in
        self?.completeBack(id: id, commit: complete)
      }
    }
  }
  private func completeBack(id: UUID, commit: Bool) {
    guard transitionID == id else { return }
    if !commit {
      resetTransition()
      return
    }
    // Keep the known parent visible until the web router has restored scroll
    // and painted it. A missing acknowledgement must never strand the wallet.
    returnTimeout = Task { [weak self] in
      do { try await Task.sleep(for: .seconds(2)) } catch { return }
      guard let self, self.transitionID == id else { return }
      self.clearBack()
    }
    onBack()
  }
  private func resetTransition() {
    transitionID = UUID()
    returnTimeout?.cancel()
    returnTimeout = nil
    isDragging = false
    awaitingBack = false
    webView?.layer.removeAllAnimations()
    webView?.transform = .identity
    underlay?.removeFromSuperview()
    underlay = nil
  }
  @objc private func updateRefreshFeedback() {
    guard let scrollView = webView?.scrollView else { return }
    let gesture = scrollView.panGestureRecognizer.state
    let pulling =
      (gesture == .began || gesture == .changed)
      && scrollView.contentOffset.y < -scrollView.adjustedContentInset.top - 16
    setRefreshFeedbackVisible(refreshAllowed && (refreshRequestID != nil || pulling))
  }
  private func setRefreshFeedbackVisible(_ visible: Bool) {
    if visible, refreshFeedback.superview == nil, let webView, let container = webView.superview {
      container.addSubview(refreshFeedback)
      NSLayoutConstraint.activate([
        refreshFeedback.centerXAnchor.constraint(equalTo: webView.centerXAnchor),
        refreshFeedback.topAnchor.constraint(
          equalTo: container.safeAreaLayoutGuide.topAnchor, constant: 8),
        refreshFeedback.widthAnchor.constraint(equalToConstant: 44),
        refreshFeedback.heightAnchor.constraint(equalToConstant: 44),
      ])
    }
    refreshFeedback.isHidden = !visible
    if visible {
      refreshIndicator.startAnimating()
    } else {
      refreshIndicator.stopAnimating()
    }
  }
  @objc func requestRefresh() {
    guard refreshAllowed, refreshRequestID == nil,
      nextRefreshID < 9_007_199_254_740_991
    else {
      if refreshRequestID == nil { refreshControl.endRefreshing() }
      return
    }
    nextRefreshID += 1
    let requestID = nextRefreshID
    refreshRequestID = requestID
    updateRefreshFeedback()
    haptic()
    refreshTimeout = Task { [weak self] in
      do { try await Task.sleep(for: .seconds(20)) } catch { return }
      _ = self?.finishRefresh(requestID: requestID)
    }
    onRefresh(requestID)
  }
  @discardableResult func finishRefresh(requestID: Int) -> Bool {
    guard refreshRequestID == requestID else { return false }
    cancelRefresh()
    return true
  }
  private func cancelRefresh() {
    refreshTimeout?.cancel()
    refreshTimeout = nil
    refreshRequestID = nil
    refreshControl.endRefreshing()
    setRefreshFeedbackVisible(false)
  }
}

import Observation
import SwiftUI
import UIKit

@MainActor
final class ShellViewController: UIViewController, UITabBarDelegate {
  let auth: AuthModel
  let browser = BrowserModel()
  private(set) var wallet: TrustedWalletViewController?
  private var currentSession: AuthSession?
  private var explore: UIViewController?
  private var signIn: UIViewController?
  private let tabs = UITabBar()
  private let content = UIView()
  private let moreButton = UIButton(type: .system)
  private var blockingPresentation = false
  private var accountPresentation = false
  private(set) var navigationRequestID = 0
  private var navigationRevision = -1
  private var navigationPending = false
  private var usesNavigationState = false
  private var requestedRoot: WalletRoot?
  var navigationRoot: WalletRoot { requestedRoot ?? walletRoot }
  var acceptsLegacyNavigation: Bool { !usesNavigationState }
  var walletInteractionsAllowed: Bool {
    !navigationPending && !blockingPresentation && wallet?.nativeSheet?.identifier == nil
      && !accountPresentation
      && wallet?.view.isHidden == false && !interactionsSuspended
  }
  private var interactionsSuspended = false
  private var approvedBackURL: URL?
  private var tabsHeight: NSLayoutConstraint?
  private(set) var walletRoot: WalletRoot = .wallet
  #if DEBUG
    var walletBootstrapScript: String?
    var walletTestSource: WalletTestSource?
  #endif

  init(auth: AuthModel = AuthModel()) {
    self.auth = auth
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { nil }
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    for child in [content, tabs, moreButton] {
      child.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(child)
    }
    tabs.delegate = self
    let items = [
      ("tab.wallet", "wallet.bifold", "wallet"), ("tab.activity", "clock", "activity"),
      ("tab.browser", "globe", "explore"),
    ]
    tabs.items = items.enumerated().map { index, item in
      let tab = UITabBarItem(
        title: NSLocalizedString(item.0, comment: "Root tab"),
        image: UIImage(systemName: item.1), tag: index)
      tab.accessibilityIdentifier = "tab.\(item.2)"
      return tab
    }
    tabs.selectedItem = tabs.items?.first
    let appearance = UITabBarAppearance()
    appearance.configureWithTransparentBackground()
    tabs.standardAppearance = appearance
    tabs.scrollEdgeAppearance = appearance
    configureMoreButton()
    view.keyboardLayoutGuide.usesBottomSafeArea = false
    let height = tabs.heightAnchor.constraint(equalToConstant: 56)
    tabsHeight = height
    // Content reaches behind the floating controls. The keyboard overlays them
    // without leaving a hidden-navigation flag after system authentication.
    NSLayoutConstraint.activate([
      content.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      content.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      content.topAnchor.constraint(equalTo: view.topAnchor),
      content.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
      tabs.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      tabs.trailingAnchor.constraint(equalTo: moreButton.leadingAnchor, constant: -4),
      tabs.bottomAnchor.constraint(equalTo: view.bottomAnchor), height,
      moreButton.trailingAnchor.constraint(
        equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
      moreButton.centerYAnchor.constraint(equalTo: tabs.topAnchor, constant: 36),
      moreButton.widthAnchor.constraint(equalToConstant: 64),
      moreButton.heightAnchor.constraint(equalToConstant: 64),
    ])
    let signIn = UIHostingController(
      rootView: SignInView { [weak self] in self?.showExplore() }
        .environment(auth).tint(Color("OisyBrandPrimary")))
    self.signIn = signIn
    mount(signIn)
    let explore = UIHostingController(
      rootView: NavigationStack {
        BrowserView(browser: browser) { [weak self] in self?.select(.wallet) }
      }.tint(Color("OisyBrandPrimary")))
    self.explore = explore
    mount(explore, reservesNavigationSpace: true)
    explore.view.isHidden = true
    showWallet()
    syncSession()
    observeAuth()
    Task { await auth.restore() }
  }
  private func mount(_ child: UIViewController, reservesNavigationSpace: Bool = false) {
    if reservesNavigationSpace {
      child.additionalSafeAreaInsets.bottom = 88
    }
    addChild(child)
    child.view.translatesAutoresizingMaskIntoConstraints = false
    content.addSubview(child.view)
    NSLayoutConstraint.activate([
      child.view.topAnchor.constraint(equalTo: content.topAnchor),
      child.view.bottomAnchor.constraint(equalTo: content.bottomAnchor),
      child.view.leadingAnchor.constraint(equalTo: content.leadingAnchor),
      child.view.trailingAnchor.constraint(equalTo: content.trailingAnchor),
    ])
    child.didMove(toParent: self)
  }
  private func observeAuth() {
    withObservationTracking {
      _ = auth.session
    } onChange: { [weak self] in
      Task { @MainActor [weak self] in
        self?.syncSession()
        self?.observeAuth()
      }
    }
  }
  private func syncSession() {
    // A cold launch can discover an expired Keychain session before any address
    // reaches the provider. Do not resurrect the previous session's permissions.
    if auth.session == nil { browser.provider.revokeAll() }
    guard currentSession != auth.session else { return }
    closeWallet()
    currentSession = auth.session
    if let session = auth.session {
      let delegated = WalletSession(
        native: session,
        onExpired: { [weak self] expired in
          self?.auth.expire(expired)
          self?.syncSession()
        }, onAccount: { [weak self] account in self?.browser.updateAccount(account) })
      let wallet = TrustedWalletViewController(session: delegated)
      self.wallet = wallet
      wallet.hostPlugin.host = self
      #if DEBUG
        wallet.bootstrapScript = walletBootstrapScript
        wallet.testSource = walletTestSource
      #endif
      mount(wallet)
    }
    walletRoot = .wallet
    showWallet()
  }
  private func closeWallet() {
    navigationRequestID = 0
    navigationRevision = -1
    navigationPending = false
    usesNavigationState = false
    requestedRoot = nil
    approvedBackURL = nil
    accountPresentation = false
    setBlockingPresentation(false)
    dismiss(animated: false)
    // Also discard anonymous Explore storage if logout beats ETH address loading.
    browser.close()
    browser.updateAccount(nil)
    wallet?.close()
    wallet?.willMove(toParent: nil)
    wallet?.view.removeFromSuperview()
    wallet?.removeFromParent()
    wallet = nil
  }
  func suspendInteractions() {
    interactionsSuspended = true
    wallet?.interactions?.invalidate()
    updateBackNavigation()
  }
  func resume() {
    interactionsSuspended = false
    wallet?.session.checkExpiration()
    Task { await auth.restore() }
    syncSession()
    updateBackNavigation()
  }
  override func viewSafeAreaInsetsDidChange() {
    super.viewSafeAreaInsetsDidChange()
    tabsHeight?.constant = 56 + view.safeAreaInsets.bottom
  }
  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    if item.tag == 2 {
      showExplore()
      return
    }
    let roots: [Int: WalletRoot] = [0: .wallet, 1: .activity]
    if let root = roots[item.tag] { select(root) }
  }
  func showExplore() {
    wallet?.interactions?.invalidate()
    view.endEditing(true)
    tabs.selectedItem = tabs.items?.first { $0.tag == 2 }
    wallet?.view.isHidden = true
    signIn?.view.isHidden = true
    explore?.view.isHidden = false
    updateNavigationVisibility()
    updateMoreMenu()
  }
  func select(_ root: WalletRoot, notifyWeb: Bool = true) {
    if notifyWeb, wallet != nil {
      requestWebScreen(root.rawValue)
      return
    }
    wallet?.interactions?.invalidate()
    // A legacy bundle can update the highlight, but cannot enable native gestures.
    approvedBackURL = nil
    navigationPending = false
    requestedRoot = nil
    walletRoot = wallet == nil ? .wallet : root
    if notifyWeb || tabs.selectedItem?.tag != 2 { showWallet() }
    updateBackNavigation()
  }
  func requestWebScreen(_ screen: String) {
    guard let wallet,
      WalletRoot(rawValue: screen) != nil || ["contacts", "preferences"].contains(screen)
    else { return }
    if WalletRoot(rawValue: screen) != nil { wallet.interactions?.invalidate() }
    view.endEditing(true)
    navigationRequestID += 1
    navigationPending = true
    requestedRoot = WalletRoot(rawValue: screen)
    approvedBackURL = nil
    // The selected root remains committed until the web router accepts the request.
    showWallet()
    wallet.hostPlugin.select(screen, requestID: navigationRequestID)
  }
  @discardableResult func commitNavigation(_ state: WalletNavigationState) -> Bool {
    guard let wallet, state.requestID == navigationRequestID,
      state.revision > navigationRevision,
      state.backURL == nil
        || WalletBackNavigationPolicy.isToken(wallet.webView?.url, origin: wallet.origin)
    else { return false }
    navigationRevision = state.revision
    usesNavigationState = true
    navigationPending = false
    requestedRoot = nil
    approvedBackURL = state.backURL
    walletRoot = state.root
    wallet.interactions?.navigationCommitted(url: wallet.webView?.url)
    // A late acknowledgement may update retained state, never leave Explore.
    if tabs.selectedItem?.tag != 2 { showWallet() }
    updateBackNavigation()
    return true
  }
  func resetNavigationForDocument() {
    wallet?.interactions?.invalidate()
    navigationRevision = -1
    navigationPending = false
    usesNavigationState = false
    requestedRoot = nil
    approvedBackURL = nil
    updateBackNavigation()
  }
  private func updateBackNavigation() {
    wallet?.setBackNavigation(
      parent: approvedBackURL,
      enabled: walletInteractionsAllowed,
      refreshEnabled: usesNavigationState && walletRoot == .wallet)
  }
  private func showWallet() {
    tabs.selectedItem = tabs.items?.first {
      $0.tag == (walletRoot == .wallet ? 0 : walletRoot == .activity ? 1 : -1)
    }
    wallet?.view.isHidden = false
    signIn?.view.isHidden = wallet != nil
    explore?.view.isHidden = true
    updateNavigationVisibility()
    updateMoreMenu()
  }
  func setBlockingPresentation(_ blocking: Bool) {
    blockingPresentation = blocking
    if blocking,
      wallet?.interactions?.isDragging == true || wallet?.interactions?.awaitingBack == true
    {
      wallet?.interactions?.clearBack()
    }
    updateNavigationVisibility()
  }
  func updateNavigationVisibility() {
    let isWelcomeVisible = wallet == nil && signIn?.view.isHidden == false
    let hidden =
      isWelcomeVisible
      || ((blockingPresentation || wallet?.nativeSheet?.hidesNavigation == true)
        && wallet != nil && wallet?.view.isHidden == false)
    tabs.isHidden = hidden
    moreButton.isHidden = hidden
    // Reveal navigation under the closing sheet, but keep it inert until the
    // same WebView and its scroll position have been restored behind it.
    let sheetActive = wallet?.nativeSheet?.identifier != nil
    tabs.isUserInteractionEnabled = !sheetActive
    moreButton.isUserInteractionEnabled = !sheetActive
    tabs.accessibilityElementsHidden = hidden || sheetActive
    moreButton.accessibilityElementsHidden = hidden || sheetActive
    updateBackNavigation()
  }
  private func configureMoreButton() {
    var configuration = UIButton.Configuration.glass()
    configuration.title = NSLocalizedString("account.more", comment: "More destinations")
    configuration.image = UIImage(named: "OisyMark")?.preparingThumbnail(
      of: CGSize(width: 26, height: 26))
    configuration.imagePlacement = .top
    configuration.imagePadding = 3
    configuration.contentInsets = NSDirectionalEdgeInsets(
      top: 6, leading: 8, bottom: 6, trailing: 8)
    configuration.cornerStyle = .capsule
    configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer {
      incoming in
      var outgoing = incoming
      outgoing.font = UIFontMetrics(forTextStyle: .caption2).scaledFont(
        for: UIFont.systemFont(ofSize: 11, weight: .semibold), maximumPointSize: 15)
      return outgoing
    }
    moreButton.configuration = configuration
    moreButton.accessibilityIdentifier = "navigation.more"
    moreButton.showsMenuAsPrimaryAction = true
    moreButton.preferredMenuElementOrder = .fixed
    moreButton.showsLargeContentViewer = true
    moreButton.largeContentTitle = configuration.title
    moreButton.largeContentImage = UIImage(named: "OisyMark")
    moreButton.addInteraction(UILargeContentViewerInteraction())
    moreButton.configurationUpdateHandler = { button in
      button.configuration?.baseForegroundColor = button.isSelected ? button.tintColor : .label
    }
    updateMoreMenu()
  }
  private func updateMoreMenu() {
    moreButton.isSelected = tabs.selectedItem == nil && wallet != nil
    let action: (MoreDestination) -> UIAction = { [weak self] destination in
      UIAction(
        title: NSLocalizedString(destination.titleKey, comment: "More destination"),
        image: UIImage(systemName: destination.symbol),
        identifier: UIAction.Identifier("more." + destination.rawValue),
        attributes: self?.wallet == nil ? [.disabled] : [],
        state: self?.moreButton.isSelected == true
          && self?.walletRoot.rawValue == destination.rawValue ? .on : .off
      ) { [weak self] _ in self?.openMore(destination) }
    }
    moreButton.menu = UIMenu(children: [
      UIMenu(
        options: .displayInline,
        children: MoreDestination.allCases.filter { $0 != .search }.map(action)),
      UIMenu(options: .displayInline, children: [action(.search)]),
    ])
  }
  func openMore(_ destination: MoreDestination) {
    guard wallet != nil else { return }
    view.endEditing(true)
    if let root = WalletRoot(rawValue: destination.rawValue) {
      select(root)
    }
  }
  func openAccount() {
    guard presentedViewController == nil, wallet != nil else { return }
    accountPresentation = true
    wallet?.interactions?.clearBack()
    updateBackNavigation()
    let controller = UIHostingController(
      rootView: AccountView(browser: browser) { [weak self] screen in
        self?.dismiss(animated: true) {
          guard let self else { return }
          self.accountPresentation = false
          if screen == "reload" {
            self.select(self.walletRoot, notifyWeb: false)
            self.wallet?.webView?.reload()
          } else {
            self.requestWebScreen(screen)
          }
        }
      }.environment(auth).tint(Color("OisyBrandPrimary"))
        .onDisappear { [weak self] in
          self?.accountPresentation = false
          self?.updateBackNavigation()
        })
    present(controller, animated: true)
  }
}

/// Fixed destinations only; no URLs or executable payloads cross the host boundary.
enum MoreDestination: String, CaseIterable {
  case notes, earn, borrow, search
  var titleKey: String { self == .search ? "tab.search" : "more." + rawValue }
  var symbol: String {
    switch self {
    case .notes: "note.text"
    case .earn: "leaf"
    case .borrow: "arrow.down.circle"
    case .search: "magnifyingglass"
    }
  }
}

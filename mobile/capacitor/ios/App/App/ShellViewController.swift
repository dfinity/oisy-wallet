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
  private var tabsHeight: NSLayoutConstraint?
  private(set) var walletRoot: WalletRoot = .wallet
  #if DEBUG
    var walletBootstrapScript: String?
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
      #endif
      mount(wallet)
    }
    select(.wallet)
  }
  private func closeWallet() {
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
  func resume() {
    wallet?.session.checkExpiration()
    auth.restore()
    syncSession()
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
    view.endEditing(true)
    tabs.selectedItem = tabs.items?.first { $0.tag == 2 }
    wallet?.view.isHidden = true
    signIn?.view.isHidden = true
    explore?.view.isHidden = false
    updateNavigationVisibility()
    updateMoreMenu()
  }
  func select(_ root: WalletRoot, notifyWeb: Bool = true) {
    if walletRoot != root { view.endEditing(true) }
    walletRoot = wallet == nil ? .wallet : root
    // A late web route acknowledgement must not pull the user out of Explore.
    if !notifyWeb && tabs.selectedItem?.tag == 2 { return }
    showWallet()
    if notifyWeb { wallet?.hostPlugin.select(walletRoot.rawValue) }
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
    updateNavigationVisibility()
  }
  private func updateNavigationVisibility() {
    let isWelcomeVisible = wallet == nil && signIn?.view.isHidden == false
    let hidden =
      isWelcomeVisible
      || (blockingPresentation && wallet != nil && wallet?.view.isHidden == false)
    tabs.isHidden = hidden
    moreButton.isHidden = hidden
    tabs.accessibilityElementsHidden = hidden
    moreButton.accessibilityElementsHidden = hidden
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
    let controller = UIHostingController(
      rootView: AccountView(browser: browser) { [weak self] screen in
        self?.dismiss(animated: true) {
          guard let self else { return }
          if screen == "reload" {
            self.select(self.walletRoot, notifyWeb: false)
            self.wallet?.webView?.reload()
          } else {
            self.select(.wallet)
            self.wallet?.hostPlugin.select(screen)
          }
        }
      }.environment(auth).tint(Color("OisyBrandPrimary")))
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

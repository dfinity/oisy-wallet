import Capacitor
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var privacyCover: UIView?

  func scene(
    _ scene: UIScene, willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    window = UIWindow(windowScene: windowScene)
    window?.rootViewController = ShellViewController()
    window?.makeKeyAndVisible()

    SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    (window?.rootViewController as? ShellViewController)?.suspendInteractions()
    guard let window, privacyCover == nil else { return }
    let cover = UIView(frame: window.bounds)
    cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    cover.backgroundColor = .systemBackground
    // Also stay above a presentation whose animation completes while inactive.
    cover.layer.zPosition = 1
    cover.accessibilityIdentifier = "privacy.cover"
    cover.accessibilityElementsHidden = true
    let mark = UIImageView(image: UIImage(named: "OisyMark"))
    mark.contentMode = .scaleAspectFit
    mark.translatesAutoresizingMaskIntoConstraints = false
    cover.addSubview(mark)
    NSLayoutConstraint.activate([
      mark.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
      mark.centerYAnchor.constraint(equalTo: cover.centerYAnchor),
      mark.widthAnchor.constraint(equalToConstant: 64),
      mark.heightAnchor.constraint(equalToConstant: 64),
    ])
    // Cover the window, not just the root controller: presented sheets can contain
    // addresses, balances and private notes too. Do this before the OS snapshot.
    window.addSubview(cover)
    privacyCover = cover
    window.layoutIfNeeded()
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    // resume synchronously checks the existing session's deadline and replaces an
    // expired wallet before revealing it. SDK restoration continues separately.
    (window?.rootViewController as? ShellViewController)?.resume()
    window?.layoutIfNeeded()
    privacyCover?.removeFromSuperview()
    privacyCover = nil
  }

  func scene(_ scene: UIScene, openURLContexts urlContexts: Set<UIOpenURLContext>) {
    SceneDelegateProxy.shared.scene(scene, openURLContexts: urlContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    SceneDelegateProxy.shared.scene(scene, continue: userActivity)
  }
}

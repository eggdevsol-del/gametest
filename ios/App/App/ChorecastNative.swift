import Capacitor
import StoreKit
import UIKit
import UserNotifications

/// The app's screen: Capacitor's web view, with the Chorecast plugin added. Main.storyboard uses this class.
class ChorecastViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ChorecastNativePlugin())
    }
}

/// Everything the Chorecast web app needs from iOS. public/chorecast/native.js is its JavaScript side and turns it into
/// window.ChorecastApp: the sign-in token in the Keychain, StoreKit 2 purchases, the push address, the share sheet and
/// printing. Purchases stay open with Apple until the web app has handed them to the server and calls finish.
@objc(ChorecastNativePlugin)
public class ChorecastNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ChorecastNativePlugin"
    public let jsName = "ChorecastNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "session", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "buy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pushToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printPage", returnType: CAPPluginReturnPromise),
    ]
    private var updates: Task<Void, Never>?
    private var pushWaiters: [CAPPluginCall] = []

    override public func load() {
        // The Keychain outlives the app, so a fresh install starts signed out rather than as whoever used it before.
        if !UserDefaults.standard.bool(forKey: "installed") {
            Keychain.write(nil)
            UserDefaults.standard.set(true, forKey: "installed")
        }
        // Renewals, and purchases made on another device, arrive here. The server hears of those from Apple itself
        // (App Store Server Notifications), so plans are simply finished. XP bundles wait for the web app.
        updates = Task.detached {
            for await result in Transaction.updates {
                if case .verified(let t) = result, t.productType != .consumable { await t.finish() }
            }
        }
        NotificationCenter.default.addObserver(self, selector: #selector(didRegister(_:)), name: .capacitorDidRegisterForRemoteNotifications, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(didFailToRegister(_:)), name: .capacitorDidFailToRegisterForRemoteNotifications, object: nil)
    }

    deinit { updates?.cancel() }

    // MARK: Signing in

    /// Where the server is (capacitor.config.json: plugins.ChorecastNative.apiBase) and this device's token, if any.
    @objc func session(_ call: CAPPluginCall) {
        var out: [String: Any] = ["apiBase": getConfig().getString("apiBase", "https://chorecast.up.railway.app") ?? ""]
        if let token = Keychain.read() { out["token"] = token }
        call.resolve(out)
    }

    @objc func setToken(_ call: CAPPluginCall) {
        Keychain.write(call.getString("token")) ? call.resolve() : call.reject("Couldn’t keep the sign-in on this device.")
    }

    // MARK: The App Store

    @objc func products(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do { call.resolve(["products": try await Product.products(for: ids).map(Self.describe)]) }
            catch { call.reject("The App Store isn’t answering. Try again soon.") }
        }
    }

    /// Resolves { jws, transactionId } once paid; {} if the grown-up cancelled; { pending: true } while it waits for
    /// approval (Ask to Buy). appAccountToken is the family's id, so the server knows whose purchase it is.
    @objc func buy(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { return call.reject("Which product?") }
        let account = call.getString("appAccountToken").flatMap(UUID.init(uuidString:))
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [id]).first else { return call.reject("That isn’t in the App Store yet.") }
                var options: Set<Product.PurchaseOption> = []
                if let account { options.insert(.appAccountToken(account)) }
                let result: Product.PurchaseResult
                if #available(iOS 17.0, *), let scene = self.bridge?.viewController?.view.window?.windowScene {
                    result = try await product.purchase(confirmIn: scene, options: options)
                } else {
                    result = try await product.purchase(options: options)
                }
                switch result {
                case .success(let verification):
                    guard case .verified(let t) = verification else { return call.reject("Apple couldn’t confirm that purchase.") }
                    call.resolve(["jws": verification.jwsRepresentation, "transactionId": String(t.id)])
                case .pending: call.resolve(["pending": true])
                case .userCancelled: call.resolve()
                @unknown default: call.resolve()
                }
            } catch {
                call.reject("That didn’t go through. Try again.")
            }
        }
    }

    @objc func finish(_ call: CAPPluginCall) {
        guard let id = call.getString("transactionId").flatMap(UInt64.init) else { return call.reject("Which purchase?") }
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let t) = result, t.id == id { await t.finish() }
            }
            call.resolve()
        }
    }

    /// Every plan and lesson pack this Apple account owns, as signed transactions for the server to check.
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync() // may ask for the Apple account's password; what's already here still counts
            var list: [String] = []
            for await result in Transaction.currentEntitlements {
                if case .verified = result { list.append(result.jwsRepresentation) }
            }
            call.resolve(["transactions": list])
        }
    }

    private static func describe(_ p: Product) -> [String: Any] {
        var d: [String: Any] = ["id": p.id, "displayPrice": p.displayPrice]
        if let sub = p.subscription {
            d["period"] = periodName(sub.subscriptionPeriod)
            if let intro = sub.introductoryOffer, intro.paymentMode == .freeTrial { d["trial"] = periodName(intro.period) }
        }
        return d
    }

    private static func periodName(_ p: Product.SubscriptionPeriod) -> String {
        let unit: String
        switch p.unit {
        case .day: unit = "day"
        case .week: unit = "week"
        case .month: unit = "month"
        case .year: unit = "year"
        @unknown default: unit = "period"
        }
        return p.value == 1 ? unit : "\(p.value) \(unit)s"
    }

    // MARK: Notifications

    /// { token, environment } once this device may show notifications; {} if the grown-up said no.
    @objc func pushToken(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .denied: call.resolve()
            case .notDetermined:
                center.requestAuthorization(options: [.alert, .sound, .badge]) { ok, _ in ok ? self.register(call) : call.resolve() }
            default: self.register(call)
            }
        }
    }

    private func register(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.pushWaiters.append(call)
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    @objc private func didRegister(_ note: Notification) {
        guard let data = note.object as? Data else { return }
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production" // TestFlight and the App Store
        #endif
        answerPush(["token": data.map { String(format: "%02x", $0) }.joined(), "environment": environment])
    }

    @objc private func didFailToRegister(_ note: Notification) { answerPush([:]) }

    private func answerPush(_ out: [String: Any]) {
        DispatchQueue.main.async {
            let waiting = self.pushWaiters
            self.pushWaiters = []
            waiting.forEach { $0.resolve(out) }
        }
    }

    // MARK: Sharing and printing

    /// A statement as a file, through the share sheet (Files, Mail, AirDrop and so on).
    @objc func share(_ call: CAPPluginCall) {
        let name = (call.getString("filename") ?? "Chorecast.txt").replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do { try (call.getString("text") ?? "").write(to: url, atomically: true, encoding: .utf8) }
        catch { return call.reject("Couldn’t make the file.") }
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else { return call.reject("Not ready yet.") }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let pop = sheet.popoverPresentationController { // iPad: a popover in the middle of the screen
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 1, height: 1)
                pop.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { _, done, _, _ in call.resolve(["shared": done]) }
            vc.present(sheet, animated: true)
        }
    }

    /// Prints the page as it is now: the web app has already swapped in the printable report.
    @objc func printPage(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let web = self.bridge?.webView else { return call.reject("Not ready yet.") }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = "Chorecast"
            let printer = UIPrintInteractionController.shared
            printer.printInfo = info
            printer.printFormatter = web.viewPrintFormatter()
            printer.present(animated: true) { _, done, _ in call.resolve(["printed": done]) }
        }
    }
}

/// This device's sign-in token, kept only in the Keychain and only for this device (not in backups to other devices).
private enum Keychain {
    private static let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "app.chorecast.session",
        kSecAttrAccount as String: "token",
    ]

    static func read() -> String? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func write(_ token: String?) -> Bool {
        SecItemDelete(query as CFDictionary)
        guard let token, !token.isEmpty, let data = token.data(using: .utf8) else { return true }
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(q as CFDictionary, nil) == errSecSuccess
    }
}

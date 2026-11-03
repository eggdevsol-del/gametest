// Chorecast inside the iOS app. The app (ios/, Capacitor) carries this same web app and adds what a web page can't do:
// StoreKit 2 purchases, the sign-in token in the Keychain, push notifications, the share sheet and printing. All of it
// is the ChorecastNative plugin (ios/App/App/ChorecastNative.swift). On the website this file does nothing.
(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const call = (method, options = {}) => C.nativePromise('ChorecastNative', method, options);
  window.ChorecastApp = {
    native: true,
    // { apiBase, token }: where the Chorecast server is, and this device's sign-in token (or null).
    session: () => call('session'),
    setToken: token => call('setToken', { token: token || null }),
    // [{ id, displayPrice, period, trial }] for the App Store products that exist.
    products: ids => call('products', { ids }).then(r => r.products || []),
    // { jws, transactionId } once paid, or null if the grown-up cancelled or it's waiting for approval. The purchase
    // stays open with Apple until finish(transactionId), after the server has it.
    buy: (id, appAccountToken) => call('buy', { id, appAccountToken }).then(r => (r.jws ? r : null)),
    finish: transactionId => call('finish', { transactionId: String(transactionId) }),
    // Every purchase this Apple account still has (plans and lesson packs), as signed transactions.
    restore: () => call('restore').then(r => r.transactions || []),
    // { token, environment } once notifications are allowed, or null.
    pushToken: () => call('pushToken').then(r => (r.token ? r : null)),
    share: ({ filename, text, type }) => call('share', { filename, text, type }),
    print: () => call('printPage'),
  };
})();

(() => {
  const debug = (...args) => window.debugLog('recaptcha.js', ...args);
  debug('Loaded');

  window.onSubmit = function (token) {
    debug('recaptcha onSubmit', token);
    document.getElementById("recaptchaForm").submit();
  };
})();

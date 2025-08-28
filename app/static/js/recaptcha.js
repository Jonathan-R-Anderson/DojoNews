const debug = (...args) => window.debugLog('recaptcha.js', ...args);
debug('Loaded');

function onSubmit(token) {
  debug('recaptcha onSubmit', token);
  document.getElementById("recaptchaForm").submit();
}

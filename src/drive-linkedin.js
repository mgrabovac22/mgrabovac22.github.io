export function linkedInProfile(value) {
  try {
    const url = new URL(value);
    const linkedIn = url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com');
    if (linkedIn && url.protocol === 'https:' && !url.username && !url.password && /^\/in\/[^/]+/.test(url.pathname)) {
      return url.href;
    }
  } catch {
    // A missing or invalid profile disables the shortcut.
  }
  return null;
}

export function createLinkedInCountdown(panel, href, copy) {
  const message = panel.querySelector('[role="status"]');
  const cancelButton = panel.querySelector('button');
  const wait = 5000;
  let redirectTimer = null;
  let displayTimer = null;

  function cancel() {
    clearTimeout(redirectTimer);
    clearInterval(displayTimer);
    redirectTimer = displayTimer = null;
    panel.hidden = true;
  }

  function start() {
    if (!href || !copy || redirectTimer !== null) return;
    const deadline = performance.now() + wait;
    const render = () => {
      const remaining = Math.max(1, Math.ceil((deadline - performance.now()) / 1000));
      const label = copy.countdown.replace('{seconds}', remaining);
      if (message.textContent !== label) message.textContent = label;
    };
    cancelButton.textContent = copy.cancel;
    panel.hidden = false;
    render();
    displayTimer = setInterval(render, 100);
    redirectTimer = setTimeout(() => {
      cancel();
      location.assign(href);
    }, wait);
  }

  cancelButton.addEventListener('click', () => {
    cancel();
    panel.closest('main').focus({ preventScroll: true });
  });
  window.addEventListener('pagehide', cancel);
  return { start, cancel };
}

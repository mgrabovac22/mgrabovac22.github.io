export const crateServices = { linkedin: 'LinkedIn', github: 'GitHub' };

export function crateProfileUrl(value, kind) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const linkedIn = kind === 'linkedin' && (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')) && /^\/in\/[^/]+/.test(url.pathname);
    const gitHub = kind === 'github' && url.hostname === 'github.com' && /^\/[a-z0-9][a-z0-9-]*\/?$/i.test(url.pathname);
    if (linkedIn || gitHub) return url.href;
  } catch {
    // A missing or invalid profile disables the shortcut.
  }
  return null;
}

export function createCrateCountdown(panel, copy) {
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

  function start(destination) {
    if (!destination || !copy || redirectTimer !== null) return;
    const deadline = performance.now() + wait;
    const render = () => {
      const remaining = Math.max(1, Math.ceil((deadline - performance.now()) / 1000));
      const label = copy.countdown.replace('{service}', destination.label).replace('{seconds}', remaining);
      if (message.textContent !== label) message.textContent = label;
    };
    cancelButton.textContent = copy.cancel;
    panel.hidden = false;
    render();
    displayTimer = setInterval(render, 100);
    redirectTimer = setTimeout(() => {
      cancel();
      location.assign(destination.href);
    }, wait);
  }

  cancelButton.addEventListener('click', () => {
    cancel();
    panel.closest('main').focus({ preventScroll: true });
  });
  window.addEventListener('pagehide', cancel);
  return { start, cancel };
}

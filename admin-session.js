(function () {
  const links = document.querySelectorAll('[data-admin-logout]');

  function setLogoutVisible(visible) {
    links.forEach(function (link) {
      link.hidden = !visible;
    });
  }

  function hasReadableAccessCookie() {
    return document.cookie.split(';').some(function (cookie) {
      return cookie.trim().indexOf('CF_Authorization=') === 0;
    });
  }

  if (!links.length) return;
  if (hasReadableAccessCookie()) {
    setLogoutVisible(true);
    return;
  }

  fetch('/Adm1n/', {
    method: 'HEAD',
    credentials: 'include',
    cache: 'no-store',
    redirect: 'manual'
  }).then(function (response) {
    setLogoutVisible(response.ok && !response.redirected && response.type !== 'opaqueredirect');
  }).catch(function () {
    setLogoutVisible(false);
  });
}());

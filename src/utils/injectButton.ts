function injectButtons() {
  const buttonbars = document.querySelectorAll('.sc-button-group');
  buttonbars.forEach((bar) => {
    if (bar.querySelector('.chop-btn')) return;

    const chopButton = document.createElement('button');
    const logo = document.createElement('img');
    chopButton.className =
      'chop-btn sc-button-secondary sc-button sc-button-medium sc-button-icon sc-button-responsive';
    chopButton.style.height = '32px';
    logo.alt = 'Chop Logo';
    logo.src = chrome.runtime.getURL('32-light.png');
    logo.className = 'logo-icon';
    chopButton.appendChild(logo);
    chopButton.onclick = () => console.log('clicked');
    bar.appendChild(chopButton);
  });
}

// Watch for DOM changes forever — catches SPA navigation + lazy-loaded content
const observer = new MutationObserver(() => {
  injectButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

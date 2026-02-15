// config.js for Shimeji Extension
// Add any specific configuration logic here later if needed.
console.log("Config page loaded.");

document.addEventListener('DOMContentLoaded', () => {
  const goToDappButton = document.getElementById('go-to-dapp');
  if (goToDappButton) {
    goToDappButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://chrome-extension-stellar-shimeji-fa.vercel.app/' });
    });
  }
});

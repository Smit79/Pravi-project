// Runs before React to apply the saved theme and avoid a flash of the wrong theme.
// Dark is the default look; light is opt-in via the toggle.
;(function () {
  var theme = null
  try { theme = localStorage.getItem('pravi-theme') } catch (e) {}
  if (theme !== 'light') document.documentElement.classList.add('dark')
})()

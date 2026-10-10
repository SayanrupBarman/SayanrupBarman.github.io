/** Discreet mute and restart buttons. */

export function createControls({ muteButton, restartButton, sound, text, machine, onRestart }) {
  const renderMute = (muted) => {
    // A fixed name plus aria-pressed: "Mute sound, toggle button, pressed".
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', text.mute);
    muteButton.title = muted ? text.unmute : text.mute;
    muteButton.dataset.muted = String(muted);
  };

  muteButton.addEventListener('click', () => {
    sound.unlock();
    sound.setMuted(!sound.isMuted());
  });
  sound.onMuteChange(renderMute);
  renderMute(sound.isMuted());

  restartButton.setAttribute('aria-label', text.restart);
  restartButton.title = text.restart;
  restartButton.addEventListener('click', onRestart);
  const syncRestart = () => { restartButton.disabled = !machine.can('RESTART'); };
  machine.subscribe(syncRestart);
  syncRestart();
}

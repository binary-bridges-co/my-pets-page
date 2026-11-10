// Send where I am (DESIGN §7.2 item 2): one location fix, built into a message the finder sends
// themselves through their own Messages app. Nothing is sent to the server or anyone else.
const DECIMALS = 5;

export function wireSendWhere(): void {
  const block = document.getElementById('where-block');
  const button = document.getElementById('where') as HTMLButtonElement | null;
  const status = document.getElementById('where-status');
  const send = document.getElementById('where-send') as HTMLAnchorElement | null;
  if (!block || !button || !status || !send || !('geolocation' in navigator)) return;
  const { phone, before, after, finding, denied } = button.dataset;
  if (!phone || before === undefined || after === undefined || !finding || !denied) return;
  block.hidden = false;
  let pending = false;
  button.addEventListener('click', () => {
    // aria-disabled rather than disabled, so keyboard focus stays on the button.
    if (pending) return;
    pending = true;
    button.setAttribute('aria-disabled', 'true');
    send.hidden = true;
    status.textContent = finding;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const where = `${pos.coords.latitude.toFixed(DECIMALS)},${pos.coords.longitude.toFixed(DECIMALS)}`;
        // The server split the message around {where}, so a pet's name is never filled again.
        const body = `${before}${where}${after}`;
        // `?&body=` opens the composer with the text on both iOS and Android.
        send.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
        status.textContent = body;
        send.hidden = false;
        pending = false;
        button.removeAttribute('aria-disabled');
        send.focus();
      },
      () => {
        status.textContent = denied;
        pending = false;
        button.removeAttribute('aria-disabled');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}

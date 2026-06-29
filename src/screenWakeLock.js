function isForeground(documentRef) {
  const visible = documentRef.visibilityState === undefined || documentRef.visibilityState === 'visible';
  const focused = typeof documentRef.hasFocus !== 'function' || documentRef.hasFocus();
  return visible && focused;
}

export function keepScreenAwakeWhileForeground({
  documentRef = document,
  navigatorRef = navigator,
  windowRef = window,
} = {}) {
  let disposed = false;
  let sentinel = null;
  let pendingRequest = null;

  const release = async () => {
    const current = sentinel;
    sentinel = null;
    if (!current || current.released) return;
    try {
      await current.release();
    } catch {
      // Le navigateur peut avoir deja libere le verrou.
    }
  };

  const request = async () => {
    if (disposed || sentinel || pendingRequest || !isForeground(documentRef) || !navigatorRef.wakeLock?.request) return false;

    pendingRequest = navigatorRef.wakeLock.request('screen')
      .then(async (lock) => {
        if (disposed || !isForeground(documentRef)) {
          try {
            await lock.release();
          } catch {
            // Le verrou peut etre libere avant la resolution de la demande.
          }
          return false;
        }

        sentinel = lock;
        lock.addEventListener?.('release', () => {
          if (sentinel !== lock) return;
          sentinel = null;
          if (!disposed && isForeground(documentRef)) request();
        }, { once: true });
        return true;
      })
      .catch(() => false)
      .finally(() => {
        pendingRequest = null;
      });

    return pendingRequest;
  };

  const syncWithForeground = () => {
    if (isForeground(documentRef)) request();
    else release();
  };

  documentRef.addEventListener('visibilitychange', syncWithForeground);
  windowRef.addEventListener('focus', syncWithForeground);
  windowRef.addEventListener('blur', syncWithForeground);
  request();

  return () => {
    disposed = true;
    documentRef.removeEventListener('visibilitychange', syncWithForeground);
    windowRef.removeEventListener('focus', syncWithForeground);
    windowRef.removeEventListener('blur', syncWithForeground);
    release();
  };
}

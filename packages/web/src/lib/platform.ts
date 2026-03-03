export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPod|iPad/.test(navigator.platform)

export const modKey = isMac ? 'Cmd' : 'Ctrl'

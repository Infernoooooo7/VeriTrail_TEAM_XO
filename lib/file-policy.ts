const BLOCKED_EXTENSIONS = new Set([
  '.apk', '.app', '.bin', '.cmd', '.com', '.cpl', '.dll', '.dmg', '.drv', '.elf',
  '.exe', '.hta', '.iso', '.jar', '.js', '.jse', '.lib', '.mjs', '.msi', '.ocx',
  '.ps1', '.scr', '.sh', '.so', '.sys', '.vbe', '.vbs', '.wsf',
]);

export function isBlockedFileName(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extension = normalizedName.includes('.') ? normalizedName.slice(normalizedName.lastIndexOf('.')) : '';
  return BLOCKED_EXTENSIONS.has(extension);
}

export function detectProgramSignature(bytes: Buffer) {
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const hasShebang = bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21;
  return startsWith([0x4d, 0x5a]) || startsWith([0x7f, 0x45, 0x4c, 0x46]) || startsWith([0xca, 0xfe, 0xba, 0xbe]) || startsWith([0xfe, 0xed, 0xfa, 0xce]) || startsWith([0xfe, 0xed, 0xfa, 0xcf]) || hasShebang;
}

export function validateUpload(fileName: string, bytes?: Buffer) {
  if (isBlockedFileName(fileName)) return 'Executable and program files are not supported.';
  if (bytes && detectProgramSignature(bytes)) return 'The uploaded file has an executable or script signature and cannot be processed.';
  return null;
}
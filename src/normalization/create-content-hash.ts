const textEncoder = new TextEncoder();

export async function createContentHash(markdown: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(markdown),
  );

  return `sha256:${Array.from(new Uint8Array(digest), toHexByte).join("")}`;
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

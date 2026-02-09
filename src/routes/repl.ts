export interface File {
  type: 'file';
  name: string;
  basename: string;
  contents: string;
  text: boolean;
}

export async function createReplLink(name: string, contents: string) {
  const data: {
    name: string;
    files: File[];
    tailwind: boolean;
  } = {
    name,
    tailwind: false,
    files: [
      {
        type: 'file',
        name: 'App.svelte',
        basename: 'App.svelte',
        contents,
        text: true,
      },
    ],
  };
  return `https://svelte.dev/playground/#${await compress_and_encode_text(JSON.stringify(data))}`;
}

// Copied from https://github.com/sveltejs/svelte.dev/blob/56446208f2915f54878b23a88e6fb2a8ccc92d46/apps/svelte.dev/src/routes/(authed)/playground/%5Bid%5D/gzip.js#L2
export async function compress_and_encode_text(input: string) {
  const reader = new Blob([input])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
    .getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      reader.releaseLock();
      // Some sites like discord don't like it when links end with =
      return btoa(buffer)
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');
    } else {
      for (let i = 0; i < value.length; i++) {
        // decoding as utf-8 will make btoa reject the string
        buffer += String.fromCharCode(value[i]);
      }
    }
  }
}

type PickMediaOptions = {
  accept: string;
  multiple: boolean;
};

export function pickMediaFilesWeb(options: PickMediaOptions): Promise<File[]> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve([]);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    input.multiple = options.multiple;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      cleanup();
      resolve(files);
    });

    input.click();
  });
}

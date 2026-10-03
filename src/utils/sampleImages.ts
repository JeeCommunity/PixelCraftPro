export interface SampleImage {
  name: string;
  url: string;
  category: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    name: 'Portrait Model',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    category: 'Portrait'
  },
  {
    name: 'Running Sneaker',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    category: 'Product'
  },
  {
    name: 'Ceramic Mug',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    category: 'Object'
  },
  {
    name: 'Scenic Mountain',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    category: 'Landscape'
  }
];

export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

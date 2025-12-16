import { storage } from '../../../shared/lib/storage';

export async function generateProfileImage(name: string): Promise<string> {
  try {
    // Generate avatar using UI Avatars (Initials)
    // format: png (better for storage than svg if we want universal support, though svg is fine)
    const encodedName = encodeURIComponent(name);
    const url = `https://ui-avatars.com/api/?name=${encodedName}&background=random&size=128&format=png`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch avatar');
    }

    const buffer = await response.arrayBuffer();

    // Save as PNG
    return await storage.saveBuffer(buffer, 'profiles', 'png');
  } catch (error) {
    console.error('Failed to generate profile image:', error);
    // Fallback to direct URL if saving fails
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  }
}

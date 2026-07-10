export function slugify(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replaceAll('|', '-')
    .replaceAll('.', '')
    .split(',')[0]
    .split('|')[0]
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replaceAll(' ', '-')
    .replaceAll('/', '-')
    .replaceAll('#', 'no')
    .replaceAll('%', '')
    .replace(/-+/g, '-');
}
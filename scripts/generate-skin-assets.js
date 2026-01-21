const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const assetsRoot = path.join(projectRoot, 'assets', 'skins');
const fullDir = path.join(assetsRoot, 'full');
const thumbsDir = path.join(assetsRoot, 'thumbs');
const outPath = path.join(projectRoot, 'src', 'assets', 'skinAssets.generated.ts');

fs.mkdirSync(fullDir, { recursive: true });
fs.mkdirSync(thumbsDir, { recursive: true });
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const files = fs.readdirSync(fullDir);
const keys = files
  .filter((file) => file.endsWith('.png') && !file.endsWith('@2x.png') && !file.endsWith('@3x.png'))
  .map((file) => path.basename(file, '.png'))
  .sort((a, b) => a.localeCompare(b));

const fullEntries = keys.map((key) => `  '${key}': require('../../assets/skins/full/${key}.png'),`);
const thumbEntries = keys.map((key) => {
  const thumbPath = path.join(thumbsDir, `${key}.png`);
  const thumbRelPath = fs.existsSync(thumbPath)
    ? `../../assets/skins/thumbs/${key}.png`
    : `../../assets/skins/full/${key}.png`;
  return `  '${key}': require('${thumbRelPath}'),`;
});
const keyEntries = keys.map((key) => `  '${key}',`);

const formatRecordEntries = (entries) => {
  if (entries.length === 0) return '';
  return `\n${entries.join('\n')}\n`;
};

const formatArrayEntries = (entries) => {
  if (entries.length === 0) return '';
  return `\n${entries.join('\n')}\n`;
};

const output = `/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run gen:skin-assets
import type { ImageSourcePropType } from 'react-native';

export const skinFullAssets: Record<string, ImageSourcePropType> = {${formatRecordEntries(fullEntries)}};
export const skinThumbAssets: Record<string, ImageSourcePropType> = {${formatRecordEntries(thumbEntries)}};
export const skinAssetKeys: string[] = [${formatArrayEntries(keyEntries)}];
`;

fs.writeFileSync(outPath, output, 'utf8');

console.log(`Generated ${keys.length} skin assets in ${path.relative(projectRoot, outPath)}`);

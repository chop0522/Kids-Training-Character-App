import { CONTACT_EMAIL } from '../config/legal';

export function getSupportText() {
  return {
    title: 'サポート',
    body:
      `よくある質問\n` +
      `・端末間で共有するには？ → 家族共有→書き出し→読み込み\n` +
      `・写真/動画が大きい場合は？ → 「含めない」を選ぶか、小分けで書き出してください\n\n` +
      `不具合報告時に欲しい情報\n` +
      `・アプリバージョン\n` +
      `・端末（iPhone / iPad）\n` +
      `・発生手順\n\n` +
      `お問い合わせ: ${CONTACT_EMAIL}`,
  };
}

import { CONTACT_EMAIL } from '../config/legal';

export function getSupportText() {
  return {
    title: 'サポート',
    body:
      `よくある質問\n` +
      `・バックアップ/復元: 親モードの「家族共有」からZIPを作成し、別端末で読み込みます。\n` +
      `・写真/動画の追加: 記録作成時に「写真・動画を追加する」から添付できます。\n` +
      `・データ削除: 記録詳細の「この記録を削除」から削除できます。\n\n` +
      `不具合報告時に欲しい情報\n` +
      `・アプリバージョン\n` +
      `・端末（iPhone / iPad）\n` +
      `・発生手順\n\n` +
      `お問い合わせ: ${CONTACT_EMAIL}`,
  };
}

import {
  ADS_ENABLED,
  ANALYTICS_ENABLED,
  CONTACT_EMAIL,
  LEGAL_UPDATED_AT,
  OPERATOR_DISPLAY_NAME,
} from '../config/legal';

export function getPrivacyText() {
  const analyticsText = ANALYTICS_ENABLED ? '解析ツールを使用しています。' : '解析ツールは使用していません。';
  const adsText = ADS_ENABLED ? '広告を表示します。' : '広告は表示しません。';
  return {
    title: 'プライバシーポリシー',
    body:
      `がんばりアルバム（以下、「本アプリ」）は、保護者とお子さまの記録を大切に扱います。\n\n` +
      `本アプリは、ユーザーが記録したトレーニング内容・写真・動画などを端末内に保存します。\n` +
      `開発者のサーバーへ送信する仕組みは現時点でありません。\n\n` +
      `収集する情報（端末内に保存）\n` +
      `・子どもの名前\n` +
      `・活動内容、所要時間、がんばり度\n` +
      `・メモ、タグ\n` +
      `・写真・動画（任意）\n\n` +
      `解析/広告について\n` +
      `${analyticsText}\n` +
      `${adsText}\n\n` +
      `権限について\n` +
      `写真・動画の添付のためにカメラ/フォトライブラリ/マイクを使用します（ユーザー操作時のみ）。\n\n` +
      `家族共有（バックアップ）\n` +
      `バックアップZIPをユーザーが共有（AirDrop/メール/ファイル等）して別端末に読み込む方式です。運営者は内容を受け取りません。\n\n` +
      `データの削除\n` +
      `アプリ内の記録削除機能で削除できます。端末からアプリを削除すると端末内データは削除されます。バックアップファイルは保存先で削除してください。\n\n` +
      `運営者: ${OPERATOR_DISPLAY_NAME}\n` +
      `お問い合わせ: ${CONTACT_EMAIL}\n\n` +
      `改定日: ${LEGAL_UPDATED_AT}`,
  };
}

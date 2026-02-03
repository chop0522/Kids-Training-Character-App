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
      `収集する情報\n` +
      `・子どもプロフィール（名前/アイコン等）\n` +
      `・トレーニング記録（種目/日付/時間/がんばり度/メモ/タグ）\n` +
      `・キャラ情報\n` +
      `・写真・動画（任意）\n\n` +
      `外部送信・第三者提供\n` +
      `外部送信および第三者提供は行いません。\n` +
      `${analyticsText}\n` +
      `${adsText}\n\n` +
      `権限について\n` +
      `写真・動画の添付のためにカメラ/フォトライブラリ/マイクを使用します（ユーザー操作時のみ）。\n\n` +
      `家族共有（バックアップ）\n` +
      `バックアップZIPをユーザーが共有（AirDrop/メール/ファイル等）して別端末に読み込む方式です。運営者は内容を受け取りません。\n\n` +
      `お子さまのプライバシー\n` +
      `保護者向け機能は保護者ゲートの先に配置し、外部リンクは保護者のみが開ける導線にしています。\n\n` +
      `運営者: ${OPERATOR_DISPLAY_NAME}\n` +
      `お問い合わせ: ${CONTACT_EMAIL}\n\n` +
      `改定日: ${LEGAL_UPDATED_AT}`,
  };
}

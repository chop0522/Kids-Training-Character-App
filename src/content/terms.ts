import { CONTACT_EMAIL, LEGAL_UPDATED_AT } from '../config/legal';

export function getTermsText() {
  return {
    title: '利用規約',
    body:
      `本アプリは、習い事や勉強・運動などの記録を家族で振り返るためのアプリです。\n\n` +
      `記録内容はユーザーの責任で入力してください。\n` +
      `本アプリの利用によって生じた損害について、運営者は法令上必要な範囲を除き責任を負いません。\n\n` +
      `禁止事項\n` +
      `・法令または公序良俗に反する行為\n` +
      `・第三者の権利を侵害する行為\n` +
      `・不適切な内容の写真/動画/記録の作成・保存\n\n` +
      `本アプリは予告なく仕様変更・提供終了する場合があります。\n\n` +
      `お問い合わせ: ${CONTACT_EMAIL}\n\n` +
      `改定日: ${LEGAL_UPDATED_AT}`,
  };
}

import type { AppState, Card } from "./types";
const rows = [
  ["AWS Backup", "バックアップ"],
  ["AWS Artifact", "コンプライアンス資料"],
  ["AWS Batch", "一括処理"],
  ["AWS Shield", "DDoS対策"],
  ["Amazon EC2", "仮想サーバー"],
  ["Amazon S3", "オブジェクトストレージ"],
  ["Amazon EBS", "EC2用ディスク"],
  ["Amazon EFS", "共有ファイルストレージ"],
  ["Amazon CloudWatch", "監視"],
  ["AWS CloudTrail", "操作履歴"],
  ["AWS Lambda", "サーバーレスでコード実行"],
  ["Amazon CloudFront", "CDN"],
  ["Amazon SNS", "一斉通知"],
  ["Amazon SQS", "メッセージキュー"],
  ["Amazon RDS", "マネージドデータベース"],
  ["Amazon DynamoDB", "NoSQLデータベース"],
  ["Amazon Route 53", "DNS"],
  ["AWS IAM", "権限管理"],
];
export const createInitialState = (): AppState => ({
  activePageId: "aws",
  pages: [
    {
      id: "aws",
      name: "AWS暗記帳",
      cards: rows.map(([left, right], i): Card => ({
        id: `aws-${i}`,
        left,
        right,
        leftReveal: true,
        rightReveal: true,
        leftProgress: 0,
        rightProgress: 0,
      })),
    },
  ],
});

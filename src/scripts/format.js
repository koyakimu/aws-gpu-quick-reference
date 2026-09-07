// 表示用の純関数。DOM にも他モジュールにも依存しないため、
// ブラウザ側 (table.js) と Node 側 (scripts/) の両方から import できる。

// 価格 (数値または null) を表示文字列にする。null は「提供なし」を意味する。
export function formatPrice(value) {
  if (value == null) return "-";
  return "$" + value.toFixed(2);
}

// count は数値または "1/8" のような分数文字列。
export function parseCount(count) {
  if (typeof count === "number") return count;
  const parts = String(count).split("/");
  return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(count);
}

// 連続する同値の行から rowspan を計算する。
// 先頭行に連続数を、それ以外の行に 0 (= セルを出さない) を入れて返す。
// gpu / ec2 は世代をまたいで結合しないよう、上位の列をキーに含める。
// 区切りには値に現れない NUL 文字を使い、キーの衝突を避ける。
export function computeSpans(rows) {
  const keys = {
    gen: (row) => row.gen,
    gpu: (row) => `${row.gen}\u0000${row.gpu}`,
    ec2: (row) => `${row.gen}\u0000${row.gpu}\u0000${row.ec2}`,
  };
  const spans = rows.map(() => ({ gen: 0, gpu: 0, ec2: 0 }));

  for (const field of Object.keys(keys)) {
    const keyOf = keys[field];
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i === rows.length || keyOf(rows[i]) !== keyOf(rows[start])) {
        spans[start][field] = i - start;
        start = i;
      }
    }
  }
  return spans;
}

// addedAt ("YYYY-MM") が now から 3 か月以内なら NEW 扱いにする。
// now は注入可能。テストが時間経過で壊れないよう固定値を渡せるようにしている。
export function isNew(addedAt, now = new Date()) {
  if (typeof addedAt !== "string") return false;
  const match = /^(\d{4})-(\d{2})$/.exec(addedAt);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const months = (now.getUTCFullYear() - year) * 12 + (now.getUTCMonth() + 1 - month);
  return months >= 0 && months <= 3;
}

// 数値に 3 桁区切りを入れる。区切るのは整数部だけで、小数部はそのまま残す。
export function formatNumber(num) {
  const [integer, fraction] = num.toString().split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

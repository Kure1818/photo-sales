/**
 * 日付関連のユーティリティ関数
 */

/**
 * 日付文字列が有効かどうかを確認する
 */
export function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  
  // YYYY-MM-DD形式かどうか確認
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * 指定した日付が現在日より前かどうかを判定する
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns 指定日が過去日付であればtrue、それ以外はfalse
 */
export function isBeforeToday(dateStr: string | null | undefined): boolean {
  if (!isValidDateString(dateStr)) return false;
  
  // 日付の00:00:00で比較するため、時間はクリア
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateStr as string);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate < today;
}

/**
 * 指定した日付が現在日より後かどうかを判定する
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns 指定日が未来日付であればtrue、それ以外はfalse
 */
export function isAfterToday(dateStr: string | null | undefined): boolean {
  if (!isValidDateString(dateStr)) return false;
  
  // 日付の00:00:00で比較するため、時間はクリア
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateStr as string);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate > today;
}

/**
 * 指定した日付が今日かどうかを判定する
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns 指定日が今日であればtrue、それ以外はfalse
 */
export function isToday(dateStr: string | null | undefined): boolean {
  if (!isValidDateString(dateStr)) return false;
  
  // 日付の00:00:00で比較するため、時間はクリア
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateStr as string);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate.getTime() === today.getTime();
}

/**
 * 日付文字列を日本語形式にフォーマットする
 * @param dateStr YYYY-MM-DD形式または YYYY-MM-DDThh:mm:ss形式の日付文字列
 * @param includeTime 時刻を含めるかどうか
 * @returns 例: 2025年5月24日（土） または 2025年5月24日（土）12:00
 */
export function formatDateToJapanese(dateStr: string | null | undefined, includeTime: boolean = false): string {
  if (!dateStr) return "日付未設定";
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "日付未設定";
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 曜日の取得
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    
    let result = `${year}年${month}月${day}日（${weekday}）`;
    
    // 時刻を含める場合
    if (includeTime && dateStr.includes('T')) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      result += ` ${hours}:${minutes}`;
    }
    
    return result;
  } catch (e) {
    console.error("日付フォーマットエラー:", e);
    return "日付未設定";
  }
}

/**
 * 販売開始日までの残り日数を計算する
 * @param salesStartDate 販売開始日（YYYY-MM-DD形式）
 * @returns 残り日数（当日は0、過去日はマイナス値）
 */
export function getDaysUntilSalesStart(salesStartDate: string | null | undefined): number {
  if (!isValidDateString(salesStartDate)) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(salesStartDate as string);
  startDate.setHours(0, 0, 0, 0);
  
  // ミリ秒の差を日数に変換
  const diffTime = startDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 販売開始状態を判定する
 * @param salesStartDate 販売開始日時（YYYY-MM-DD または YYYY-MM-DDThh:mm:ss形式）
 * @param salesEndDate 販売終了日時（YYYY-MM-DD または YYYY-MM-DDThh:mm:ss形式）
 * @returns 販売状態のオブジェクト
 */
export function getSalesStatus(salesStartDate: string | null | undefined, salesEndDate: string | null | undefined): {
  isBeforeSalesStart: boolean;
  isAfterSalesEnd: boolean;
  isSalesPeriod: boolean;
  daysUntilStart: number;
  daysUntilEnd: number;
  hoursUntilStart: number; // 販売開始までの時間（時間単位）
  minutesUntilStart: number; // 販売開始までの時間（分単位）
} {
  const now = new Date(); // 現在時刻（時分秒も含む）
  
  let startDate: Date | null = null;
  if (salesStartDate) {
    try {
      startDate = new Date(salesStartDate);
      if (isNaN(startDate.getTime())) startDate = null;
    } catch (e) {
      console.error("販売開始日の解析エラー:", e);
      startDate = null;
    }
  }
  
  let endDate: Date | null = null;
  if (salesEndDate) {
    try {
      endDate = new Date(salesEndDate);
      if (isNaN(endDate.getTime())) endDate = null;
    } catch (e) {
      console.error("販売終了日の解析エラー:", e);
      endDate = null;
    }
  }
  
  // 販売開始前かどうか
  const isBeforeSalesStart = startDate !== null && now < startDate;
  
  // 販売終了後かどうか
  const isAfterSalesEnd = endDate !== null && now > endDate;
  
  // 販売期間中かどうか
  const isSalesPeriod = !isBeforeSalesStart && !isAfterSalesEnd;
  
  // 販売開始までの日数
  const daysUntilStart = startDate !== null
    ? Math.max(0, Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // 販売終了までの日数
  const daysUntilEnd = endDate !== null
    ? Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // 販売開始までの時間（時間単位）
  const hoursUntilStart = startDate !== null
    ? Math.max(0, Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60)) % 24)
    : 0;
  
  // 販売開始までの時間（分単位）
  const minutesUntilStart = startDate !== null
    ? Math.max(0, Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60)) % 60)
    : 0;
  
  return {
    isBeforeSalesStart,
    isAfterSalesEnd,
    isSalesPeriod,
    daysUntilStart,
    daysUntilEnd,
    hoursUntilStart,
    minutesUntilStart
  };
}

/**
 * イベント開催期間を日本語フォーマットで表示する（曜日表記なし）
 * @param dateRange 「YYYY-MM-DD to YYYY-MM-DD」形式の日付範囲
 * @returns 「YYYY年MM月DD日〜DD日」形式
 */
export function formatEventDateRange(dateRange: string): string {
  if (!dateRange || !dateRange.includes('to')) {
    return dateRange;
  }

  try {
    const [startDateStr, endDateStr] = dateRange.split(' to ');
    
    // 開始日と終了日のDateオブジェクトを作成
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return dateRange;
    }
    
    // 開始日のフォーマット
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    
    // 終了日のフォーマット
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();
    
    // 年と月が同じかどうかチェック
    if (startYear === endYear && startMonth === endMonth) {
      // 同じ年・月の場合は短縮形式
      return `${startYear}年${startMonth}月${startDay}日〜${endDay}日`;
    } else if (startYear === endYear) {
      // 同じ年だが月が異なる場合
      return `${startYear}年${startMonth}月${startDay}日〜${endMonth}月${endDay}日`;
    } else {
      // 年も異なる場合
      return `${startYear}年${startMonth}月${startDay}日〜${endYear}年${endMonth}月${endDay}日`;
    }
  } catch (e) {
    console.error("日付範囲のフォーマットエラー:", e);
    return dateRange;
  }
}
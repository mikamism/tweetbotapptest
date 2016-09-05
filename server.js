/*
 処理概要：アーティスト名を受け取るとそのフォロワー数を返す
 作成日：2016/7/22
 作成者：mikamism
*/

var restify = require('restify');
var builder = require('botbuilder');
// コネクションの作成
var Connection = require('tedious').Connection;

// Azure上のbotを設定
var bot = new builder.BotConnectorBot({
  appId: 'sample-tweet-bot',
  appSecret: '642d202a2f6540958e913cacd739da3d'
});

// DB接続情報の設定
var config = {
  userName: 'socialadmin',
  password: 'ufeuQ7sPu2',
  server: 'socialtestdb.database.windows.net',
  // Azure上のDBの場合は必須
  options: { encrypt: true, database: 'socialtestdb' }
};

// 処理の振り分け
bot.add('/', new builder.CommandDialog()
  // 大文字小文字でも正規表現でひとまとめとする
  .matches('^(Reminder: exile|Reminder: EXILE|Reminder: エグザイル|Reminder: えぐざいる)', builder.DialogAction.beginDialog('/exile'))
  .matches('^(Reminder: aaa|Reminder: AAA|Reminder: とりえ|Reminder: トリエ|Reminder: トリプルエー)', builder.DialogAction.beginDialog('/aaa'))
  .matches('^(Reminder: ヤフー|Reminder: Yahoo|Reminder: yahoo|Reminder: やふー|Reminder: やほー|Reminder: ヤホー)', builder.DialogAction.beginDialog('/yahoo'))
  .matches('^(Reminder: 1 hour yahoo)', builder.DialogAction.beginDialog('/yahoo1hour'))
  .matches('^(Reminder: twitter)', builder.DialogAction.beginDialog('/twittertrend'))
  .matches('^(Reminder: 1 hour twitter)', builder.DialogAction.beginDialog('/twittertrend1hour'))
  .matches('^(Reminder: dat)', builder.DialogAction.beginDialog('/dat'))
  .matches('^help', showHelp)
  .onDefault(function (session) {
    //var msg = 'This is a test for TweetBot of SQLServer!!';
    //var usertext = session.message.text;
    //builder.Prompts.text(session, usertext);
    //session.send('Hello, I am Test bot! ' + msg);
    //session.send('You said \n' + usertext);
  })
);

// ヘルプが呼ばれた場合
function showHelp(session) {
  session.send('◆日時とそこからn時間分のサマリーを指定する場合\n\n'
              + 'Reminder: dat,指定日(yyyymmddhh24),n,yahoo or twitter\n\n'
              + '例：Yahooトレンドワードの2016年8月20日15時から8時間分のサマリーを取得する場合\n\n'
              + 'Reminder: dat,2016082015,8,yahoo'
              );
  session.endDialog();

}

// 日時指定
bot.add('/dat', [
  function (session) {
    // 投稿内容を取得
    var usertext = session.message.text;

    // カンマ区切りで文字列を取得
    var csvData = usertext.split(",");

    // 形式チェックテキスト
    var textFormat = "";
    var year = "";
    var month = "";
    var day = "";
    var hour = "";

    // 日時の形式に問題ないかチェック
    if( csvData[1].length != 10 ) {
      textFormat = "日時の形式が正しくありません。\n\n"
                  + "yyyymmddhh24の形式で入力してください。\n\n"
                  + "例）2016年8月25日18時の場合\n\n"
                  + "2016082518";

      session.send(textFormat);
      session.endDialog();

    } else {
      year = csvData[1].substring(0,4);
      month = csvData[1].substring(4,6);
      day = csvData[1].substring(6,8);
      hour = csvData[1].substring(8,10);

      // タイトルの作成
      var title = csvData[3] + "急上昇ワード(" + year + "年" + month + "月" + day + "日"+ hour + "時" + " " + csvData[2] + "時間集計)";

      // コネクションの作成
      var connection = new Connection(config);
      // DB接続
      connection.on('connect', function (err) {

        var sql = "";

        // twitterとyahooで振り分け
        if( usertext.indexOf("yahoo") != -1 ) {
          sql = "SELECT TOP 20 "
                    + "CONVERT(varchar(5),ROW_NUMBER() OVER(ORDER BY SUM(a.score) DESC)) + ' ： [' + a.word + '](http://search.yahoo.co.jp/search?p=' + REPLACE(a.word,'#','%23') + '&fr=krank_hb_new&ei=UTF-8&rkf=1)' as row "
                    + ",'[ [*Google*](https://www.google.co.jp/search?q=' + REPLACE(a.word,'#','') + ') ]' google "
                    + ",'[ [*Trend*](https://www.google.co.jp/trends/explore?date=now%201-d&geo=JP&q=' + REPLACE(a.word,'#','') + ') ]' trend "
                    + ",dbo.funcExistYahooSurgeMaster(a.word) + ':' newflg "
                    + "FROM dbo.T_YahooSurgeWordsHour a "
                    + "WHERE a.timeSum >= CONVERT(DATETIME, CONVERT(varchar(13), DATEADD(hour, -" + csvData[2] + ","
                    + "CONVERT(DATETIME, "
                        + "substring('" + csvData[1] + "',1,4)+'/'+ "
                        + "substring('" + csvData[1] + "',5,2)+'/'+ "
                        + "substring('" + csvData[1] + "',7,2)+' ' + "
                        + "substring('" + csvData[1] + "',9,2)+':00' "
                        + ")"
                    + "), 120)+':00') "
                    + "AND a.timeSum <= CONVERT(DATETIME,"
                        + "substring('" + csvData[1] + "',1,4)+'/'+ "
                        + "substring('" + csvData[1] + "',5,2)+'/'+ "
                        + "substring('" + csvData[1] + "',7,2)+' ' + "
                        + "substring('" + csvData[1] + "',9,2)+':00' "
                        + ")"
                    + "GROUP BY a.word "
                    + "ORDER BY SUM(a.score) DESC, a.word DESC;";
        } else {
          sql = "SELECT TOP 20 "
                    + "CONVERT(varchar(5),ROW_NUMBER() OVER(ORDER BY SUM(a.score) DESC)) + ' ： [' + a.word + '](https://twitter.com/search?q=' + REPLACE(a.word,'#','%23') + '&src=tren)' as row "
                    + ",'[ [*Google*](https://www.google.co.jp/search?q=' + REPLACE(a.word,'#','') + ') ]' google "
                    + ",'[ [*Trend*](https://www.google.co.jp/trends/explore?date=now%201-d&geo=JP&q=' + REPLACE(a.word,'#','') + ') ]' trend "
                    + ",dbo.funcExistTwitterTrendMaster(a.word) + ':' newflg "
                    + "FROM dbo.T_TwitterTrendWordsHour a "
                    + "WHERE a.timeSum >= CONVERT(DATETIME, CONVERT(varchar(13), DATEADD(hour, -" + csvData[2] + ","
                    + "CONVERT(DATETIME, "
                        + "substring('" + csvData[1] + "',1,4)+'/'+ "
                        + "substring('" + csvData[1] + "',5,2)+'/'+ "
                        + "substring('" + csvData[1] + "',7,2)+' ' + "
                        + "substring('" + csvData[1] + "',9,2)+':00' "
                        + ")"
                    + "), 120)+':00') "
                    + "AND a.timeSum <= CONVERT(DATETIME,"
                        + "substring('" + csvData[1] + "',1,4)+'/'+ "
                        + "substring('" + csvData[1] + "',5,2)+'/'+ "
                        + "substring('" + csvData[1] + "',7,2)+' ' + "
                        + "substring('" + csvData[1] + "',9,2)+':00' "
                        + ")"
                    + "GROUP BY a.word "
                    + "ORDER BY SUM(a.score) DESC, a.word DESC;";
        }
        // データ取得
        executeStatement(session, connection, sql,title, 1);
      });
      // sessionを閉じる
      session.endDialog();
    }
  },
]);

// EXILEの場合
bot.add('/exile', [
  function (session) {

    // タイトルの設定
    var title = "EXILEメンバーのTwitterフォロワー数";

    // コネクションの作成
    var connection = new Connection(config);
    // DB接続
    connection.on('connect', function (err) {
      // SQLを生成
      var sql = "SELECT a.username + ' ：' name,format(MAX(a.follower),N'#,0') follower "
                + "FROM dbo.TwitteruserFollowerList a "
                + "WHERE a.username IN "
                  + "('USA_from EXILE',N'黒木 啓司','EXILE TETSUYA/E.P.I.','EXILE SHOKICHI','EXILE NAOTO',N'岩田 剛典') "
                + "GROUP BY a.username;"
      // データ取得
      executeStatement(session, connection, sql, title, 1);
    });
    // sessionを閉じる
    session.endDialog();
  },
]);

// AAAの場合
bot.add('/aaa', [
  function (session) {

    // タイトルの設定
    var title = "AAAメンバーのTwitterフォロワー数";

    // コネクションの作成
    var connection = new Connection(config);
    // DB接続
    connection.on('connect', function (err) {
      var sql = "SELECT a.username + ' ：' name,format(MAX(a.follower),N'#,0') follower "
                + "FROM dbo.TwitteruserFollowerList a "
                + "WHERE a.username LIKE ('%AAA%') "
                + "GROUP BY a.username;"
      // データ取得
      executeStatement(session, connection, sql, title, 1);
    });
    // sessionを閉じる
    session.endDialog();
  },
]);

// Yahooの場合
bot.add('/yahoo', [
  function (session) {

    // タイトルの作成
    var title = "Yahoo!急上昇ワード(1日集計)";

    // コネクションの作成
    var connection = new Connection(config);
    // DB接続
    connection.on('connect', function (err) {
      var sql = "SELECT TOP 20 "
                + "CONVERT(varchar(5),ROW_NUMBER() OVER(ORDER BY SUM(a.score) DESC)) + ' ： [' + a.word + '](http://search.yahoo.co.jp/search?p=' + REPLACE(a.word,'#','%23') + '&fr=krank_hb_new&ei=UTF-8&rkf=1)' as row "
                + ",'[ [*Google*](https://www.google.co.jp/search?q=' + REPLACE(a.word,'#','') + ') ]' google "
                + ",'[ [*Trend*](https://www.google.co.jp/trends/explore?date=now%201-d&geo=JP&q=' + REPLACE(a.word,'#','') + ') ]' trend "
                + ",dbo.funcExistYahooSurgeMaster(a.word) + ':' newflg "
                + "FROM dbo.T_YahooSurgeWordsHour a "
                + "WHERE a.timeSum >= CONVERT(DATETIME, CONVERT(varchar(13), DATEADD(hour, -24, dbo.Now()), 120)+':00') "
                + "GROUP BY a.word "
                + "ORDER BY SUM(a.score) DESC, a.word DESC;"
      // データ取得
      executeStatement(session, connection, sql,title, 0);
    });
    // sessionを閉じる
    session.endDialog();
  },
]);

// Yahoo 1 hourの場合
bot.add('/yahoo1hour', [
  function (session) {

    // タイトルの作成
    var title = "Yahoo!急上昇ワード：";

    // コネクションの作成
    var connection = new Connection(config);
    // DB接続
    connection.on('connect', function (err) {
      var sql = "SELECT TOP 20 "
                + "CONVERT(varchar(5),ROW_NUMBER() OVER(ORDER BY SUM(a.score) DESC)) + ' ： [' + a.word + '](http://search.yahoo.co.jp/search?p=' + REPLACE(a.word,'#','%23') + '&fr=krank_hb_new&ei=UTF-8&rkf=1)' as row "
                + ",'[ [*Google*](https://www.google.co.jp/search?q=' + REPLACE(a.word,'#','') + ') ]' google "
                + ",'[ [*Trend*](https://www.google.co.jp/trends/explore?date=now%201-d&geo=JP&q=' + REPLACE(a.word,'#','') + ') ]' trend "
                + ",dbo.funcExistYahooSurgeMasterHour(a.word) + ':' newflg "
                + "FROM dbo.T_YahooSurgeWordsHour a "
                + "WHERE a.timeSum >= CONVERT(DATETIME, CONVERT(varchar(13), DATEADD(hour, -1, dbo.Now()), 120)+':00') "
                + "GROUP BY a.word "
                + "ORDER BY SUM(a.score) DESC;"
      // データ取得
      executeStatement(session, connection, sql, title, 0);
    });
    // sessionを閉じる
    session.endDialog();
  },
]);

// Twitterトレンドの場合
bot.add('/twittertrend', [ setTimeout(
  function (session) {

    // タイトルの作成
    var title = "Twitterトレンドワード(1日集計)：";

    // コネクションの作成
    var connection = new Connection(config);
    // DB接続
    connection.on('connect', function (err) {
      var sql = "SELECT TOP 20 "
                + "CONVERT(varchar(5),ROW_NUMBER() OVER(ORDER BY SUM(a.score) DESC)) + ' ： [' + a.word + '](https://twitter.com/search?q=' + REPLACE(a.word,'#','%23') + '&src=tren)' as row "
                + ",'[ [*Google*](https://www.google.co.jp/search?q=' + REPLACE(a.word,'#','') + ') ]' google "
                + ",'[ [*Trend*](https://www.google.co.jp/trends/explore?date=now%201-d&geo=JP&q=' + REPLACE(a.word,'#','') + ') ]' trend "
                + ",dbo.funcExistTwitterTrendMaster(a.word) + ':' newflg "
                + "FROM dbo.T_TwitterTrendWordsHour a "
                + "WHERE a.timeSum >= CONVERT(DATETIME, CONVERT(varchar(13), DATEADD(hour, -24, dbo.Now()), 120)+':00') "
                + "GROUP BY a.word "
                + "ORDER BY SUM(a.score) DESC, a.word DESC;"
      // データ取得
      executeStatement(session, connection, sql, title, 0);
    });
    // sessionを閉じる
    session.endDialog();
  },10000),
]);

// 1 hour Twitterの場合
bot.add('/twittertrend1hour', [
  function (session) {

    // タイトルの作成
    var title = "Twitterトレンドワード：";

    // コネクションの作成
    var connection = new Connection(config);
    // DB接続
    connection.on('connect', function (err) {
      var sql = "SELECT TOP 20 "
                + "CONVERT(varchar(5),ROW_NUMBER() OVER(ORDER BY SUM(a.score) DESC)) + ' ： [' + a.word + '](https://twitter.com/search?q=' + REPLACE(a.word,'#','%23') + '&src=tren)' as row "
                + ",'[ [*Google*](https://www.google.co.jp/search?q=' + REPLACE(a.word,'#','') + ') ]' google "
                + ",'[ [*Trend*](https://www.google.co.jp/trends/explore?date=now%201-d&geo=JP&q=' + REPLACE(a.word,'#','') + ') ]' trend "
                + ",dbo.funcExistTwitterTrendMasterHour(a.word) + ':' newflg "
                + "FROM dbo.T_TwitterTrendWordsHour a "
                + "WHERE a.timeSum >= CONVERT(DATETIME, CONVERT(varchar(13), DATEADD(hour, -1, dbo.Now()), 120)+':00') "
                + "GROUP BY a.word "
                + "ORDER BY SUM(a.score) DESC;"
      // データ取得
      executeStatement(session, connection, sql, title, 0);
    });
    // sessionを閉じる
    session.endDialog();
  },
]);

// SQL Serverへ接続
function executeStatement(session, connection, sql, title, timeFlg) {
  var Request = require('tedious').Request;
  var TYPES = require('tedious').TYPES;

  // クエリの作成
  var request = new Request(sql, function (err) {
    if (err) {
      session.send('クエリ作成時にエラーが発生しました。管理者へお問い合わせください。');
      console.log(err);
    }
  });

  // 結果を宣言し初期化
  var result = "";

  // タイトルを付与
  result = title;

  // 検索結果判定フラグ
  var searchResult = 0;

  // 時間フラグにて時間を管理
  if (timeFlg == 0)
    // タイトルに時間を付与
    result += makeJpDate() + "\n\n";
  else
    result += "\n\n";

  // 行を取得する度に呼ばれる
  request.on('row', function (columns) {
    // 取得した件数分ループ
    columns.forEach(function (column) {
      if (column.value === null) {
        console.log('NULL');
      } else {
        result += column.value + " ";
      }
    });
    // 改行をセット
    result += "\n\n";
    searchResult = 1;
  });

  // 最後に呼ばれる
  request.on('doneProc', function (rowCount, more) {
    console.log(rowCount + ' rows returned');

    // 結果が1件もない場合
    if (searchResult == 0) {
      result += "検索結果がありません。条件を変更してください。"
    }
    // 結果の出力 
    session.send(result);
  });

  // SQLを実行する
  connection.execSql(request);
}

function makeJpDate() {
  // 現在の時刻を取得
  var dt = new Date();

  // 日本時間に修正
  dt.setTime(dt.getTime() + 32400000);

  // 日付を数字として取り出す
  var year = dt.getFullYear();
  var month = dt.getMonth()+1;
  var day = dt.getDate();
  var hour = dt.getHours();

  return year + '/' + month + '/' + day + ' ' + hour + ':00';
}

// severセットアップ
var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});
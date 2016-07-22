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
var bot = new builder.BotConnectorBot(
  { appId: 'sample-tweet-bot',
    appSecret: '642d202a2f6540958e913cacd739da3d' });

bot.add('/', new builder.CommandDialog()
    // 大文字小文字でも正規表現でひとまとめとする
    .matches('^(exile|EXILE|エグザイル|えぐざいる)', builder.DialogAction.beginDialog('/exile'))
    .matches('^(aaa|AAA|とりえ|トリエ|トリプルエー)', builder.DialogAction.beginDialog('/aaa'))
    .matches('^(test|TEST)', builder.DialogAction.beginDialog('/test'))
    .matches('^(syam|hi)', showFuncHi)
    .matches('^func', showFuncMessage)
    .onDefault(function (session) {
        var msg = 'This is a test for TweetBot of SQLServer!!';
        session.send('Hello, I am Test bot! ' + msg);
    }));

// ToDo 改行テストで使用
function showFuncMessage(session) {
  session.send('あなたはファンクションを呼んだね。%0D%0Aうん、きっとそうだ');
  //session.endDialog();
}

// ToDo 改行テストで使用
function showFuncHi(session) {
  session.send('っはい、山田です。');
}

// ToDo 改行テストで使用
bot.add('/test', [
    function (session) {
      var txt = 'You said Test!!' 
              + '\nWhat are you doing??';
      session.send(txt);
      session.endDialog();
    },
]);

// EXILEの場合
bot.add('/exile', [
     function (session) {
        
        var config = {
            userName: 'socialadmin',
            password: 'ufeuQ7sPu2',
            server: 'socialtestdb.database.windows.net',
            // Azure上のDBの場合は必須
            options: { encrypt: true, database: 'socialtestdb' }
        };

        var connection = new Connection(config);
        connection.on('connect', function (err) {
            // If no error, then good to proceed. 
            //console.log("Connected");
            executeStatement(session, connection, 'EXILE');
        });

        session.endDialog();
      },

]);

// AAAの場合
bot.add('/aaa', [
     function (session) {
        
        var config = {
            userName: 'socialadmin',
            password: 'ufeuQ7sPu2',
            server: 'socialtestdb.database.windows.net',
            // Azure上のDBの場合は必須
            options: { encrypt: true, database: 'socialtestdb' }
        };

        var connection = new Connection(config);
        connection.on('connect', function (err) {
            // If no error, then good to proceed. 
            //console.log("Connected");
            executeStatement(session, connection, 'AAA');
        });

        session.endDialog();
      },

]);

// SQL Serverへ接続
function executeStatement(session, connection, aname) {
    var Request = require('tedious').Request;
    var TYPES = require('tedious').TYPES;

    // クエリの作成
    var request = new Request("SELECT a.username + ' ：' name,format(MAX(a.follower),N'#,0') follower FROM dbo.TwitteruserFollowerList a  WHERE a.username like '%" + aname +"%' GROUP BY a.username;", function (err) {
        if (err) {
            console.log(err);
        }
    });

    var result = "";
    request.on('row', function (columns) {
        columns.forEach(function (column) {
            if (column.value === null) {
                console.log('NULL');
            } else {
                result += column.value + " ";
            }
        });
        // ToDo 改行でなんとかしたい
        session.send(result);
        result = "";
    });

    request.on('done', function (rowCount, more) {
        console.log(rowCount + ' rows returned');
    });
    connection.execSql(request);
}

var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});
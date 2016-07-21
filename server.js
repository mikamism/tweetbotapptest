var restify = require('restify');
var builder = require('botbuilder');
// コネクションの作成
var Connection = require('tedious').Connection;

var bot = new builder.BotConnectorBot(
  { appId: 'sample-tweet-bot',
    appSecret: '642d202a2f6540958e913cacd739da3d' });

bot.add('/', new builder.CommandDialog()
    // 大文字小文字でも正規表現でひとまとめとする
    .matches('^(exile|EXILE)', builder.DialogAction.beginDialog('/exile'))
    .matches('^(test|TEST)', builder.DialogAction.beginDialog('/test'))
    .matches('^func', showFuncMessage)
    .onDefault(function (session) {
        var msg = 'This is a test for TweetBot of SQLServer!!';
        session.send('Hello, I am Test bot! ' + msg);
    }));

function showFuncMessage(session) {
  session.send('あなたはファンクションを呼んだね。\nうん、きっとそうだ');
  //session.endDialog();
}

// bot振り分け後の処理
bot.add('/test', [
    function (session) {
      var txt = 'You said Test!!' 
              + '\nWhat are you doing??';
      session.send(txt);
      session.endDialog();
    },
]);

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
            executeStatement(session, connection);
        });

        session.endDialog();
      },

]);

function executeStatement(session, connection) {
    var Request = require('tedious').Request;
    var TYPES = require('tedious').TYPES;

    // クエリの作成
    var request = new Request("SELECT a.username + ' ：' name,format(MAX(a.follower),N'#,0') follower FROM dbo.TwitteruserFollowerList a  WHERE a.username like 'EXILE%' GROUP BY a.username;", function (err) {
        if (err) {
            console.log(err);
        }
    });

//session.send(request);

    var result = "";
    request.on('row', function (columns) {
        columns.forEach(function (column) {
            if (column.value === null) {
                console.log('NULL');
            } else {
                result += column.value + " ";
            }
        });
        //console.log(result);
        //builder.Prompts.text(session, result);
        session.send(result);
        result = "";
    });

    request.on('done', function (rowCount, more) {
        console.log(rowCount + ' rows returned');
    });
    connection.execSql(request);
    //builder.Prompts.text(session, result);
}

var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});
var restify = require('restify');
var builder = require('botbuilder');
var tmpdata = {};

var bot = new builder.BotConnectorBot(
  { appId: 'sample-tweet-bot',
    appSecret: '642d202a2f6540958e913cacd739da3d' });

bot.use(function(session, next) {
  if (!session.userData.addrbook)
    session.userData.addrbook = [];
  next();
});

bot.add('/', new builder.CommandDialog()
  .matches('^(regist|add)',  builder.DialogAction.beginDialog('/regist'))
  .matches('^(find|search)', builder.DialogAction.beginDialog('/find'))
  .matches('^(exile|search)', builder.DialogAction.beginDialog('/exile'))
  .matches('^list', showList)
  .onDefault(function (session) {
    var msg = 'you have ' + session.userData.addrbook.length + ' data.';
    session.send('Hello, I am address book bot. ' + msg);
  }));

function showList(session) {
  var tmp = session.userData.addrbook.map(
    current => 'name: ' + current.name + ' tel: ' + current.tel);
  session.send(tmp.join(', '));
}

bot.add('/regist', [
  function(session) { 
    builder.Prompts.text(session, 'what name do you want to add ?');
  },
  function(session, results) {
    tmpdata.name = results.response;
    builder.Prompts.text(session, 'telephone number? ');
  },
  function(session, results) {
    tmpdata.tel = results.response;
    session.userData.addrbook.push(tmpdata);
    session.send('registerd!');
    session.endDialog();
  }
]);

bot.add('/find', [
  function(session) {
    builder.Prompts.text(session, 'find? ');
  },
  function(session, results) {
    var target = results.response;
    var res = session.userData.addrbook.filter(
      item => item.name == target ? true : false
    );
    if (res[0]) {
      session.send("name: " + res[0].name + " tel: " + res[0].tel);
    } else {
      session.send('no such data');
    }
    session.endDialog();
  }, 
]);

// exileと話しかけた場合の処理
bot.add('/exile', [
  function(session) {
    // コネクションの作成
    var Connection = require('tedious').Connection;
    var config = {
      userName: 'socialtestdb',
      password: 'ufeuQ7sPu2',
      server: 'socialtestdb.database.windows.net',
      // Azure上のDBの場合は必須
      options: {encrypt: true, database: 'AdventureWorks'}
    };
    var connection = new Connection(config);
    connection.on('connect', function(err) {
      // If no error, then good to proceed. 
      console.log("Connected");
      executeStatement(session);
    });

    session.send("kiminimuchu");
    session.endDialog();
    
    var Request = require('tedious').Request;
    var TYPES = require('tedious').TYPES;
  },
  function executeStatement(session) {
    // クエリの作成
    request = new Request("SELECT a.username,MAX(a.follower) FROM dbo.TwitteruserFollowerList a WHERE a.username like 'EXILE%' GROUP BY a.username;", function(err) {
      if (err) {  
        console.log(err);
      }
    });
    var result = "";
    request.on('row', function(columns) {
      columns.forEach(function(column) {
        if (column.value === null) {
          console.log('NULL');
        } else {
          result+= column.value + " ";
        }
      });
      console.log(result);
      result ="";
    });

    request.on('done', function(rowCount, more) {
      console.log(rowCount + ' rows returned');
    });
    connection.execSql(request);
    //builder.Prompts.text(session, result);
  }
]);

var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});
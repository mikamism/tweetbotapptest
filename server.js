var express = require('express');
var port = process.env.PORT || 1337;
var app = express();
 
 console.log('test_start')
 
app.get('/', function (req, res) {
  res.send('Hello Express World!');
});
 
app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});

console.log('test_end')
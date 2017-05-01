var app = require('express')(),
	http = require('http').Server(app),
	io = require('socket.io').listen(http),
	mongoDb = require('mongodb').MongoClient,
	users = {};

http.listen(8080, function(){
	console.log('Server Started.');
});

app.get('/', function(request, response){
	response.sendFile(__dirname + '/index.html');
});
	
mongoDb.connect('mongodb://127.0.0.1/chat', function(err, db){
	if(err) throw err;
	
	io.sockets.on('connection' , function(socket){
		
		var col = db.collection('messages');
		
		socket.on('new user', function(data, callback){
			if(data in users){
				callback(false);
			}else{
				callback(true);
				socket.nickname=data;
				users[socket.nickname] = socket;
				io.sockets.emit('usernames' , Object.keys(users));
			}
		});
		
		socket.on('disconnect', function(data){
			if(!socket.nickname) return;
			delete users[socket.nickname];
			io.sockets.emit('usernames' , Object.keys(users));
		});
		
		socket.on('send message' , function(data){
			var name = socket.nickname;
			col.insert({name : name,
						to : data.to,
						message : data.message});
			users[data.to].emit('new message' , name);			
		});
		
		socket.on('retrieve message' , function(data){
			var name = socket.nickname,
				to = data;
			col.find({
						$or:[{
								$and: [ {"name": name}, {"to":to}]
							 },
							 {
								$and: [ {"name": to}, {"to":name}]
							 }]
					}).toArray(function(err, docs){
					if(err) throw err;
					users[name].emit('display messages' , docs);
			});
			
		});
	});
	
});
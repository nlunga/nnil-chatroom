const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const TWO_HOURS = 1000 * 60 * 60 * 2;
const formatMessage = require('./utils/messages')
// const { resolveCname } = require('dns');

const {
    PORT= 5000,
    SESS_LIFETIME = TWO_HOURS,
    SESS_NAME = 'sid',
    HOST = 'localhost',
    USER = 'root',
    PASSWORD = '',
    DB_NAME = 'test',
    SESS_SECRET = 'haoPsURXAFxeB0ph',
    NODE_ENV = 'development'
} = process.env;

const options = {
    host: HOST,
    port: 3306,
    user: USER,
    password: PASSWORD,
    database: DB_NAME
};

const IN_PROD = NODE_ENV === 'production';

var con = mysql.createConnection({
    host: HOST,
    user: USER,
    password: PASSWORD
});

var recon = mysql.createConnection({
    host: HOST,
    user: USER,
    password: PASSWORD,
    database: DB_NAME
});

con.connect((err) => {
    if (err) console.log(err);
    console.log('Connected!');
    con.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`, (err, result) => {
        if (err) throw err;
        console.log("Database created");
    });

    var userSql = "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) NOT NULL UNIQUE, email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL)";
    var messageSql = "CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, sender VARCHAR(255) NOT NULL, message VARCHAR(255) NOT NULL, destination VARCHAR(255) NOT NULL)";
    var notificationsSql = "CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, notifyUser VARCHAR(255) NOT NULL, messages VARCHAR(255) NOT NULL)";
    
    recon.query(userSql, function (err, result) {
      if (err) throw err;
      console.log("Users Table created");
    });

    recon.query(messageSql, function (err, result) {
        if (err) throw err;
        console.log("Messages Table created");
    });

    recon.query(notificationsSql, function (err, result) {
        if (err) throw err;
        console.log("Notifications Table created");
    });
    
});

app.set('trust proxy', 1); // trust first proxy
app.use(session({
  name: SESS_NAME,
  secret: SESS_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MySQLStore(options),
  cookie: {
      maxAge : SESS_LIFETIME,
      sameSite: true,
      secure: IN_PROD
    }
}));

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const redirectLogin = (req, res, next) => {
    if (!req.session.username) {
        res.redirect('/login');
    } else {
        next();
    }
}

const redirectChat = (req, res, next) => {
    if (req.session.username) {
        res.redirect('/');
    } else {
        next();
    }
}

app.get('/', redirectLogin, (req, res) => {
    res.render('pages/index', {
        username: req.session.username
    });
});

// app.get('/:user', redirectLogin, (req, res) => {

//     res.render('pages/index', {
//         username: req.session.username
//     });
// });

app.get('/signup', (req, res) => {
    res.render('pages/signup');
});

app.post('/signup', (req, res) => {
    if (req.body.username && req.body.email && req.body.password) {
        recon.query(`SELECT * FROM users`, (err, result) => {
            // recon.query(`SELECT * FROM users WHERE username = '${req.body.username}' OR email = '${req.body.email}' LIMIT 1`, (err, result) => {
            result.forEach((item, index, array) => {
                if (item.username === req.body.username || item.email === req.body.email) {
                    console.log('User already exists, please try again');
                    return res.redirect('/signup');
                }else if (index === (result.length - 1) && item.username !== req.body.username && item.email !== req.body.email) {
                    bcrypt.hash(req.body.password, 10, (err, hash) => {
                        if (err) throw err;
                        recon.query(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,[req.body.username, req.body.email, hash], (err, result) => {
                            if (err) throw err;
                            console.log('1 query has been inserted');
                            return res.redirect('/login');;
                        });
                    });
                }
            });
        });
    }else {
        console.log('Invalid input');
    }
});

app.get('/login', redirectChat,(req, res) => {
    res.render('pages/login');
});

app.get('/logout', redirectLogin,  (req, res) => {
    req.session.destroy( (err) => {
        if (err) return res.redirect('/');
        if (err) throw err;
        res.clearCookie('sid');
        res.redirect('/login')
    });
});

app.post('/login', (req, res) => {
    if (req.body.login && req.body.password) {
        recon.query(`SELECT * FROM users WHERE username = '${req.body.login}' LIMIT 1`, (err, result) => {
            if (err) throw err;
            // console.log(result);
            if (result.length === 0) {
                return console.log('User does not exist. Please register user.');
            }else {
                if (result[0].username === req.body.login){
                    const hash = result[0].password;
                    bcrypt.compare(req.body.password, hash, (err, response) => {
                       if (err) throw err;
                       if (response === true) {
                           console.log(result[0].ID)
                           req.session.id = result[0].ID;
                           req.session.username = result[0].username;
                           req.session.email = result[0].email;
                           res.redirect('/');
                       }
                    });
                }
            }
        });
    }else {
        console.log('Invalid input');
    }
});

app.get('/contact', redirectLogin, (req, res) => {
    recon.query(`SELECT username FROM users WHERE username != '${req.session.username}'`, (err, result) => {
        if (err) throw err;
        // console.log(result);
        res.render('pages/contact', {
            users: result
        });
    });
});

io.on('connect', (socket) => {
    // console.log(`Connected...`);

    const chatBot = 'nnilChat Bot';
    socket.on('joinRoom', ({username, room}) => {
        socket.join(room);
        console.log(username);
        console.log(room)
        socket.emit('message', formatMessage(chatBot,`Welcome to ${room}!`));
        // socket.broadcast.to(room).emit('message', formatMessage(chatBot ,'A user has joined the chat'));
        socket.broadcast.to(room).emit('message', `A user has joined the chat`);
        // socket.broadcast.to(room).emit('message', `${username} has joined the chat`);

        socket.on('chat', (data) => {
            console.log(data);
            // io.sockets.emit('message', data);
            // socket.broadcast.in(room).emit('message', formatMessage(data.handle ,data.message)); /// This broadcasts to all but self
            io.sockets.in(room).emit('message', formatMessage(data.handle ,data.message)); /// This broadcasts to all including self
        });
    });

    // recon.query(`SELECT username FROM users WHERE username != '${req.session.username}'`, (err, result) => {
    //     if (err) throw err;
    //     // console.log(result);
    //     res.render('pages/contact', {
    //         users: result
    //     });
    // });
    

    /* socket.on('chat', (data) => {
        console.log(data);
        // io.sockets.emit('message', data);
        io.sockets.emit('message', formatMessage(data.handle ,data.message));
    }); */

    socket.on('typing', (data) => {
        socket.broadcast.emit('check', data);
    });

    // Broadcast when user connects

    //Broadcast when user disconnects
    socket.on('disconnect', () => {
        io.emit('message', formatMessage(chatBot, 'A user has left the chat'));
    });
});

http.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require ('ejs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require ("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate')
const app = express();


app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended:true}))

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())





mongoose.connect('mongodb://127.0.0.1:27017/userDB')

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    secret: String,
    googleId: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


const User = new mongoose.model("User", userSchema)
passport.use(User.createStrategy())

passport.serializeUser(function(user, done){
    done(null, user.id)
})

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user)
    })
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback: true,
    userProfileUrl: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        console.log(profile)
      return done(err, user);
    });
  }
));



passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        console.log(profile)
      return cb(err, user);
    });
  }
));



app.get('/', function(req, res){
    res.render('home')
})

// app.get('/auth/google', function(req, res){
//     passport.authenticate("google", { scope: ['profile'] })

  
// })

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {failureRedirect: '/login'}), function(req, res){
        res.redirect("/secrets")
    });


    app.get('/auth/facebook',
    passport.authenticate('facebook'));
  
  app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      
      res.redirect('/secrets');
    });



app.get('/login', function(req, res){
    res.render('login')
})

app.get('/register', function(req, res){
    res.render('register')
})

app.get("/secrets", function(req, res){
   User.find({secret: {$ne: null}}, function(err, foundUsers){
    if(err){
        console.log(err)
    }else{
        if(foundUsers){
            res.render("secrets", {usersWithSecrets: foundUsers})
        }
    }
   })
})
app.get('/submit', function(req, res){
    if (req.isAuthenticated()){
        res.render("submit")
    }else {
        res.redirect('login')
    }
})

app.get("/logout", function(req, res){
    req.logout(function(err){
        if (err){
            console.log(err)
        }else {
            res.redirect('/')
        }
    });
    
})


app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err)
            res.redirect('/register')
        }else{
                passport.authenticate("local")(req, res, function(){
                        res.redirect('/secrets')
                })
        }
    })
 
});

app.post("/login", function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
req.login(user, function(err){
    if (err){
        console.log(err)
    }else {
        passport.authenticate("local")(req, res, function(){
            res.redirect('/secrets')
        })
    }
})

});

app.post('/submit', function(req, res){
    const submittedSecret = req.body.secret

   
User.findById(req.user.id, function(err, foundUser){
    if (err){
        console.log(err)
    }else {
        if(foundUser){
            foundUser.secret = submittedSecret
            foundUser.save(function(){
                res.redirect('/secrets')
            })
        }
    }
})


})


app.listen(3000, function(req, res){
    console.log('up on 3k')
})

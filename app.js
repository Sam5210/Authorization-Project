//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema ({
    email: String,
    username: String,
    password: String,
    googleId: String,
    secrets: [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
      done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.id);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(request, response){
        response.render("home");
    });

app.get("/secrets", function(request, response){
    User.find(
        {secrets: {$exists : true, $not: {$size: 0}}},
        function(error, foundUsers){
            if(error){
                console.log(error);
            }
            else{
                if(foundUsers){
                    response.render("secrets", {usersWithSecrets: foundUsers});
                }
            }
        }
    );
});

app.get("/submit", function(request, response){
    if(request.isAuthenticated()){
        response.render("submit");
    }
    else{
        response.redirect("/login");
    }
});
app.post("/submit", function(request, response){
    const secret = request.body.secret;
    User.findById(request.user.id, function(error, foundUser){
        if(error){console.log(error);}
        else{
            if(foundUser){
                foundUser.secrets.push(secret);
                foundUser.save(function(){
                    response.redirect("/secrets");
                });
            }
        }
    });
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login"}),
  function(request, response) {
    // Successful authentication, redirect secrets.
    response.redirect("/secrets");
});
app.route("/register")
    .get(function(request, response){
        response.render("register");
    })
    .post(async function(request, response){
        User.register(
            {username: request.body.username}, 
            request.body.password,
            function(error, user){
                if(error){
                    console.log(error);
                    response.redirect("/register");
                }
                else{
                    passport.authenticate("local")(request, response, function(){
                        let prevSession = request.session;
                        request.session.regenerate(function(err){
                            if(err){console.log(err);}
                            else{
                                Object.assign(request.session, prevSession);
                                response.redirect("/secrets");
                            }
                        });
                    });
                }
            }
        );
    });

app.route("/login")
    .get(function(request, response){
        response.render("login");
    })
    .post(async function(request, response){
        const user = new User ({
            username: request.body.username,
            password: request.body.password,
        });
        request.login(user, function(error){
            if(error){console.log(error);}
            else{
                passport.authenticate("local")(request, response, function(){
                    let prevSession = request.session;
                    request.session.regenerate(function(err){
                        if(err){console.log(err);}
                        else{
                            Object.assign(request.session, prevSession);
                            response.redirect("/secrets");
                        }
                    });
                });
            }
        });
    });

app.get("/logout", function(request, response){
        request.logout();
        response.redirect("/");
});

app.listen(3000);
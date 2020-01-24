   //using nodemon to auto restart server
   //commandline: "npm run devstart" to run server on auto restart
   
   var users = []        //used for storing data and debugging locally, will replace with API calls to DB
   
   //May want to keep key in environment vars file for secret key; NOT CURRENTLY IN USE
//    if (process.env.NODE_ENV !== "production" ){
//        require("dotenv").config()
//    }


   var express = require("express"),
        bodyParser = require("body-parser"),
        bcrypt = require("bcrypt"),
        session = require('express-session'),
        passport = require("passport"),
        flash = require("express-flash");
    var app = express();

    var initializePassport = require("./passport-config");  //Moved passport setup into passport-config.js   
    initializePassport(                                     //Initilize passport setup
        passport, 
                                                            //REPLACE WITH API CALLS:
        email => users.find(user => user.email === email),  //Getuserbyemail, returns user hash, id, and account type based on email
        id => users.find(user => user.id === id )           //GetuserbyID, returns user hash, email, and account type based on id
    );

    app.set("view engine", "ejs");                          //establish ejs as template engine
    app.use(bodyParser.urlencoded({extended: true}));       //pull HTML-form vars into server.js; allow nested objects
    app.use(flash());                                       //express-flash is used by passport to return login error msgs to EJS template
    app.use(session({
        secret: "SuperSecretKudosKey",   //could also get from .env file holding environment vars use:"process.env.SESSION_SECRET"
        resave: false,                  //resave session vars even when nothing has changed = false
        saveUninitialized: false       //save an empty value if no actual value = false
    }))
    app.use(passport.initialize());
    app.use(passport.session());    //link passport to express sessions for persistant login

//function to check if user currently has authentication cookie, if not redirect to login    
function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return next()
    }
    else{
        res.redirect("/login");
    }
}


//================ROUTES=============================== 

// LOGIN PAGE   
    app.get("/login", function(req, res){
        res.render("login");
    });

    app.post("/login", passport.authenticate("local",{
        // console.log(req.body.userEmail); console.log(req.body.userPass);
        successRedirect: "/secret",
        failureRedirect: "/login",
        failureFlash: true      //displays flash message about failure type

    }));


// CREATE PAGE   
    app.get("/create", function(req, res){
        res.render("create");
    });

    app.post("/create", async(req,res) => {
        // "accountType" is {"admin" or "manager"}
        // console.log(req.body.userEmail); console.log(req.body.userPass); console.log(req.body.accountType);
      
        try{
            var hashedPass = await bcrypt.hash(req.body.userPass, 10)       //Hash the user created password for safe storage (10 is Salt Val)
            // API CALL HERE TO CREATE ACCOUNT
            users.push({
                id:     Math.floor( Math.random()*1000000000 ),    //Figure out a better way to give users unique IDs or just let DB do it
                email: req.body.userEmail,
                password: hashedPass,
                type: req.body.accountType 
            });
            //should really check that account doesn't already exist. 
            res.redirect("/create");
        } 
        catch(error) {
            res.redirect("/badrequest")
        }
        console.log(users);
        
    });

// SECRET PAGE   
    app.get("/secret", checkAuthenticated, function(req, res){
        //This is just a hidden page to test authentication but where we can add more API calls and create pages of user specific data
        res.render("secret");
    });


// 404    
    app.get("/*", function(req,res){
        res.send("Request not Found! 404 Bro")
    });


//================LISTEN===============================
    app.listen(31112, function(){
        console.log("Server started on port 31112")
    });
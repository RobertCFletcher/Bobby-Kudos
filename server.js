   var users = []        //used for storing data and debugging locally, will replace with API calls
   
   //Require Envirornment Vars - May want to keep key in environment vars file
   if (process.env.NODE_ENV !== "production" ){
       require("dotenv").config()
   }


   var express = require("express"),
        bodyParser = require("body-parser"),
        bcrypt = require("bcrypt"),
        session = require('express-session'),
        passport = require("passport"),
        flash = require("express-flash");
    var app = express();

    var initializePassport = require("./passport-config");  //Moved passport setup into passport-config.js   
    initializePassport(
        passport, 
        email => users.find(user => user.email === email), //Getuserbyemail, Looks up user info by email and passes in, Replace with API call
        id => users.find(user => user.id === id )
    );

    app.set("view engine", "ejs");                          //establish ejs as template engine
    app.use(bodyParser.urlencoded({extended: true}));       //pull HTML-form vars into server.js; allow nested objects
    app.use(flash());
    app.use(session({
        secret: "SuperSecretKudosKey",   //could also get from .env (process.env.SESSION_SECRET)
        resave: false,                  //resave session vars even when nothing has changed
        saveUninitialized: false       //save an empty value if no actual value
    }))
    app.use(passport.initialize());
    app.use(passport.session());    

//function to check if user currently has authentication cookie    
function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return next()
    }
    else{
        res.redirect("/login");
    }
}


//================ROUTES=============================== 
// LOGIN
    app.get("/login", function(req, res){
        res.render("login");
    });

    app.post("/login", passport.authenticate("local",{
        //HTML Form variables are "userEmail" and "userPass"
        // console.log(req.body.userEmail); console.log(req.body.userPass);
        successRedirect: "/secret",
        failureRedirect: "/login",
        failureFlash: true      //displays flash message about failure type


    }));

// CREATE    
    app.get("/create", function(req, res){
        res.render("create");
    });

    app.post("/create", async(req,res) => {
        //Form variables are "userEmail", "userPass", "accountType" which is {"admin" or "manager"}
        // console.log(req.body.userEmail); console.log(req.body.userPass); console.log(req.body.accountType);
      
        try{
            var hashedPass = await bcrypt.hash(req.body.userPass, 10)       //Hash the user created password for safe storage (10 is Salt Val)
            // API call here to create account:
            users.push({
                id:     Math.floor( Math.random()*1000000000 ),    //Figure out a better way to give users unique IDs
                email: req.body.userEmail,
                password: hashedPass,
                type: req.body.accountType 
            });
            res.redirect("/create");
        } 
        catch(error) {
            res.redirect("/badrequest")
        }
        console.log(users);
        
    });

// SECRET    
    app.get("/secret", checkAuthenticated, function(req, res){
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
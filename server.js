   //using nodemon to auto restart server
   //commandline: "npm run devstart" to run server on auto restart

   //USER API FORMAT:
   // users.id ; users.email ; users.hash ; users.type

   //INCLUDED PACKAGES
   //==================================================================
   var express = require("express"),
        bodyParser = require("body-parser"),
        bcrypt = require("bcrypt"),
        session = require('express-session'),
        passport = require("passport"),
        flash = require("express-flash");
    // require('dotenv').config()
    var LocalStrategy = require("passport-local").Strategy;         //Just need strategy from passport local
    var bcrypt = require("bcrypt");
    var request = require("request");                                     //used to hash/salt passwords and compare password hashes
    var base64Img = require("base64-img");
    var fs = require("fs-extra");
    var svg2img = require("svg2img");
    var app = express();
    var nodemailer = require('nodemailer');


    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'kudos.reauth@gmail.com',
          pass: '2kudospass@4'
        }
      });

    // PASSPORT INITIALIZATION FUNCTION
    //  Authentication function 
    //  Take user email and password as params 
    //  Get user info from database using user entered email as key, 
    //  Compare user entered password with stored user password hash
    //=================================================================
    function initializePassport(passport, getUserByEmail, getUserById){
        var authenticateUser = async function(email, password, done){
                try{
                    var user = await getUserByEmail(email)                      //await is expecting a promise to be resolved in getUserByEmail
                    testUser(user, password, done)
                   } 
                catch(error){
                    return done(error, false, )                                          //some authentication error
                   }
        }
        passport.use(new LocalStrategy({ usernameField: 'userEmail', passwordField: "userPass"}, authenticateUser))
        passport.serializeUser(function(user, done){
              done(null, {id: user.id, type: user.type });                      //Store both ID and type
              })
              //saves the user.id in the session
        passport.deserializeUser(async (id, done) =>  {
             var getUser = await getUserById(id) 
             return done(null, getUser)    
        })  

    }
    //================================================================    
    function testUser( user, password, done){
                if(user==null){
                   //No matching email in DB to user's email
                   return done(null, false, { message: "Email or password incorrect" })
                }
                bcrypt.compare(password, user.password).then(function(result){
                   if(result == true){
                        //password correct, return authenticated user
                        return done(null, user)
                    }
                    else {
                    //password incorrect
                        return done(null, false, { message: "Email or password incorrect" })
                    }
                }    
        )}
    
    //CALLING PASSPORT INITIALIZATION
    //==================================================================    
    initializePassport(                                       //Params: passport, getUserByEmail(), getUserByID()
        passport, 
        //GET USER BY EMAIL (API CALL)
        function (email) {                                      
                return new Promise((resolve, reject) => {                   //PROMISE resolves to await in authenticateUser
                coreAPI = "https://kudosapi.wl.r.appspot.com/users/";       //USER OBJECT format should be:                 
                request(coreAPI + email, function (error, response, body) 
                {
                    if (error) 
                    {
                        console.log("ERROR-Get USER by email - ", error);
                        var user = null
                        resolve(user)
                    }
                    if (!error) 
                    {
                        if(body.trim() === "sql: no rows in result set")
                        {
                            console.log("No users in set")
                            body = null;
                        }
                        else{
                            var personObj = JSON.parse(body);
                            var user = {};
                            user.id= personObj.userid;
                            user.email = personObj.email;
                            user.password = personObj.password;
                            user.type = personObj.usertype;
                            user.createdby = personObj.createdby;
                                                }
                        resolve(user);
                    }
                });
                
            }) //end of promise
        },
        //GET USER BY ID (API CALL)                                                    
        function (ID) { 
                return new Promise((resolve, reject) => {                                           //PROMISE resolves to await in authenticateUser
                    coreAPI = "https://kudosapi.wl.r.appspot.com/users";      //USER OBJECT format should be:
                    //USER {id: "<number.", email: "<a@a.com>", hash: "<asdasd>", type: "admin/manager"}                    
                    request(coreAPI, function (error, response, body) 
                    {
                        if(!error){
                            var parsed = JSON.parse(body);
                            var personObj = parsed.find(x => x.userid === ID.id) //Find object of user who matches ID
                            var user = {};  //import found user info to new object
                            user.id = personObj.userid;
                            user.email = personObj.email;
                            user.password = personObj.password;
                            user.type = personObj.usertype;
                            user.createdby = personObj.createdby;
                            resolve(user);
                            }
                        else{
                            console.log("ERROR- get user by Id")
                            var user = null
                            resolve(user);
                            }
                    });
            })//end of promise
        }
    );
        

    //OTHER PACKAGE SETUP
    //==================================================================
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
    app.use(express.static("public")); //use public folder to hold assets

    //COOKIE CHECK
    //==================================================================  
    function checkAuthenticated(req, res, next){
        if (req.isAuthenticated()){                 //Passport Auth function
            return next()
        }
        else{
            res.redirect("/login");
        }
    }

    //CHECK USER TYPE
    //=================================================================
    function requireRole(role){
    return function (req, res, next) {
        if (req.user && req.user.type === role) {
            next();
        } else {
            res.redirect("./login");
        }
      }
    }


// ROUTES
//=============================================== 
    // HOME REDIRECT
        app.get("/", function(req,res){
            res.redirect("/login")
        });

    // LOGIN PAGE   
        app.get("/login", function(req, res){
            res.render("login", {pagetitle: "Login"});
        });

        app.post("/login", passport.authenticate("local",{
            successRedirect: "/loginSuccess",
            failureRedirect: "/login",
            failureFlash: true      //displays flash message about failure type

        }));

    //Forgot Password        
        app.get("/forgot", function(req, res){
            res.render("forgotPass", {pagetitle: "Recover Password"});
        });

        app.post("/forgot", function(req, res){
            userRequest = "https://kudosapi.wl.r.appspot.com/users/";
            request(userRequest, async function (error, response, body){
                var resetList = { userID: 0, userType: "", userHash: "", userEmail: req.body.userEmail}
                bodyParsed = JSON.parse(body);
                
                //check if account exists
                for(var j = 0; j < bodyParsed.length; j++)
                {   if(bodyParsed[j].email === resetList.userEmail)
                    {
                        resetList.userID = bodyParsed[j].userid
                        resetList.userType = bodyParsed[j].usertype
                        break;                  
                    }
                }
                //if email not found then redirect to login
                if(resetList.userID === 0)
                    {res.redirect("/login")}

                //generate temp password
                var hashLength = 12;
                var result = ""
                var characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
                var charactersLength = characters.length;
                for ( var i = 0; i < hashLength; i++ ) {
                   result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }

                //send email
                var mailOptions = {
                    from: 'kudos.reauth@gmail.com',
                    to: resetList.userEmail,
                    subject: 'Kudos Password Reset Request',
                    text: 'A request was submitted to reset the password for your Kudos account. Your new password is: ' + result + '\nPlease login to your Kudos account and change your password as soon as possible.'
                  };
                  
                  transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                      console.log(error);
                    } else {
                    }
                  }); 

                  //reset password
                try{    newpassword = await bcrypt.hash(result, 10) 
                    userRequest = "https://kudosapi.wl.r.appspot.com/users/" + resetList.userType +"s/" + resetList.userID;
                    request(userRequest, function (error2, response2, body2){
                        bodyParsed = JSON.parse(body2);
                        var updateParams = {
                            email: bodyParsed.email,
                            password: newpassword
                            };
                        if(resetList.userType === "manager")
                        {
                            updateParams.firstname = bodyParsed.firstname;
                            updateParams.lastname = bodyParsed.lastname;
                        }
                        bodyString = JSON.stringify(updateParams);
                        var options = { method: 'PUT',
                        url: 'https://kudosapi.wl.r.appspot.com/users/'+ resetList.userType + "s/" +resetList.userID,
                        headers: { 'cache-control': 'no-cache' },
                        body:bodyString
                        };
                        request(options, function (error2, response2, body2) {
                            if (error2) throw new Error(error2);
                                {res.redirect("/login");}

                        });
                    });
            }
            catch(error){
                console.log(error);
                redirect("/badrequest")
            } 
                




            });
        });
    

    // LOGIN SUCCESS
        app.get("/loginSuccess", checkAuthenticated, function(req,res){
            if(req.user.type==="admin")
            {res.redirect("/admin")}
            else if(req.user.type==="manager")
            {res.redirect("/manager")}
            else
            {res.send("412 - Precoditions Failed")}
        });

    // CREATE PAGE   
        app.get("/create", checkAuthenticated, requireRole("admin"), function(req, res){
        // app.get("/create", function(req, res){
            res.render("create", {pagetitle: "Account Creation"});
        });

        
        app.post("/create", checkAuthenticated, requireRole("admin"), async(req,res) => {
            // "accountType" is {"admin" or "manager"}        
            try{
                var hashedPass = await bcrypt.hash(req.body.userPass, 10)       //Hash the user created password for safe storage (10 is Salt Val)
                // API CALL HERE TO CREATE ACCOUNT
                if(req.body.accountType === "manager")
                {
                        var data = {
                        firstname: req.body.userFirst,
                        lastname: req.body.userLast,
                        email: req.body.userEmail,
                        password: hashedPass,
                        createdby: req.user.id
                        }
                        var options = { method: 'POST',
                          url: 'https://kudosapi.wl.r.appspot.com/users/managers',
                          headers: 
                           { 'cache-control': 'no-cache',
                             'content-type': 'application/x-www-form-urlencoded' },
                          form: false, 
                          body: JSON.stringify(data)  
                        };
                        
                        request(options, function (error, response, body) {
                          if (error) throw new Error(error);
                          res.redirect("/admin")
                        });
                }
                if(req.body.accountType === "admin")
                {
                        var data = {
                        firstname: req.body.userFirst,
                        lastname: req.body.userLast,
                        email: req.body.userEmail,
                        password: hashedPass,
                        createdby: req.user.id
                        }

                        var options = { method: 'POST',
                          url: 'https://kudosapi.wl.r.appspot.com/users/admins',
                          headers: 
                           { 'cache-control': 'no-cache',
                             'content-type': 'application/x-www-form-urlencoded' },
                          form: false, 
                          body: JSON.stringify(data)  
                        };
                        
                        request(options, function (error, response, body) {
                          if (error) throw new Error(error);
                          res.redirect("/admin")
                        });
                }
            } 
            catch(error) {
                console.log(error);
                res.redirect("/badrequest2")
            }
            
        });

    // ADMIN PAGE   
        app.get("/admin", checkAuthenticated, requireRole("admin"), function(req, res){
            userRequest = "https://kudosapi.wl.r.appspot.com/users/admins";
            request(userRequest, function (error, response, adminbody){
                adminParsed = JSON.parse(adminbody)
                userRequest = "https://kudosapi.wl.r.appspot.com/users/managers";
                request(userRequest, function (error, response, managerbody){
                    managerParsed = JSON.parse(managerbody)
                res.render("admin.ejs", {pagetitle: "Admin", adminData: adminParsed, managerData: managerParsed, userid: req.user.id});
                });    
            });
        });

    //MODIFY ADMIN ACCOUNT
    app.get("/admin/modifyad/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/admins/";
        request(userRequest + req.params.modNum, function (error, response, body){
            bodyParsed = JSON.parse(body);
            res.render("adminModify.ejs", {pagetitle: "ModifyAdmin", adminData: bodyParsed});
        });
    });

    app.post("/admin/modifyad/edit/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/admins/";
        request(userRequest + req.params.modNum, function (error, response, body){
            bodyParsed = JSON.parse(body);
            var updateParams = {
                email: req.body.email,
                password: bodyParsed.password
                };
                if(updateParams.email === ""){updateParams.email = bodyParsed.email};  
            bodyString = JSON.stringify(updateParams);
            var options = { method: 'PUT',
                url: 'https://kudosapi.wl.r.appspot.com/users/admins/'+req.params.modNum,
                headers: { 'cache-control': 'no-cache' },
                body:bodyString
                };
            request(options, function (error2, response2, body2) {
                if (error2) throw new Error(error2);
                res.redirect("/admin")

            });
        });
    });


    //DELETE ADMIN ACCOUNT
    app.get("/admin/deletead/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/admins/";
        request(userRequest + req.params.modNum, function (error, response, body){
            bodyParsed = JSON.parse(body);
            res.render("adminDelete.ejs", {pagetitle: "DeleteAdmin", adminData: bodyParsed});
        });
    });

    app.get("/admin/deletead/bye/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/admins/" + req.params.modNum;
        var options = { method: 'DELETE',
        url: userRequest,
        headers: 
        { 'cache-control': 'no-cache' } }; 
        request(options, function (error, response, body) {
        if (error){ throw new Error(error)}
        else{
            res.redirect("/admin")}
      });
    });

    //MODIFY MANAGER ACCOUNT
    app.get("/admin/modifymanager/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/managers/";
        request(userRequest + req.params.modNum, function (error, response, body){
            bodyParsed = JSON.parse(body);
            res.render("managerModify.ejs", {pagetitle: "ModifyManager", managerData: bodyParsed});
        });
    });

    app.post("/admin/modifymanager/edit/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/managers/";
        request(userRequest + req.params.modNum, function (error, response, body){
            bodyParsed = JSON.parse(body);

            var updateParams = {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                password: bodyParsed.password
                };

            if(updateParams.firstname === ""){updateParams.firstname = bodyParsed.firstname};    
            if(updateParams.lastname === ""){updateParams.lastname = bodyParsed.lastname};    
            if(updateParams.email === ""){updateParams.email = bodyParsed.email};    

            bodyString = JSON.stringify(updateParams);
            var options = { method: 'PUT',
                url: 'https://kudosapi.wl.r.appspot.com/users/managers/'+req.params.modNum,
                headers: { 'cache-control': 'no-cache' },
                body:bodyString
                };
            request(options, function (error2, response2, body2) {
                if (error2) throw new Error(error2);
                res.redirect("/admin")

            });
        });
    });


    //DELETE MANAGER ACCOUNT
    app.get("/admin/deletemanager/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/managers/";
        request(userRequest + req.params.modNum, function (error, response, body){
            bodyParsed = JSON.parse(body);
            res.render("managerDelete.ejs", {pagetitle: "DeleteManager", managerData: bodyParsed});
        });
    });

    app.get("/admin/deletemanager/bye/:modNum", checkAuthenticated, requireRole("admin"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/users/managers/" + req.params.modNum;
        var options = { method: 'DELETE',
        url: userRequest,
        headers: 
        { 'cache-control': 'no-cache' } }; 
        request(options, function (error, response, body) {
        if (error){ throw new Error(error)}
        else{
            res.redirect("/admin")}
      });
    });



    // MANAGER PAGE
        app.get("/manager", checkAuthenticated, requireRole("manager"), function(req, res){

            userRequest = "https://kudosapi.wl.r.appspot.com/awards/" ;
            request(userRequest, function (error, response, body){
                if(body.trim() === "sql: no rows in result set" || body.trim() == "null")
                {
                    parsedData = [];
                }
                else
                {
                    parsedData = JSON.parse(body);
                }
                if(parsedData.length === undefined) //less than 2 awards, so get obj instead of array
                {
                var tempArray = []
                    tempArray.push(parsedData);
                    parsedData = tempArray;
                }
                var tempData = []
                if(body != "null"){
                    for(var j=0; j<parsedData.length; j++)
                    {
                        if(parsedData[j].createdby.userid == req.user.id)
                        tempData.push(parsedData[j]);
                    }
                }
                res.render("manager.ejs",{awardData: tempData, pagetitle: "Manager"});
            });
        });


    //CREATE NEW AWARD
    app.get("/awards", checkAuthenticated, requireRole("manager"), function(req, res){
        request("https://kudosapi.wl.r.appspot.com/awards/regions", function (error, response, bodysub){
        var parsedRegions = JSON.parse(bodysub);
            res.render("awards.ejs", {pagetitle: "Award Creation", regions: parsedRegions});
        });    

    });
    
    app.post("/awards", checkAuthenticated, requireRole("manager"), function(req, res){

            var updateParams = {
                region: {regionid: Number(req.body.region) },
                type: req.body.type,
                recipientname: req.body.recipientname,
                recipientemail: req.body.recipientemail,
                createdby: {userid: req.user.id }
                };
            bodyString = JSON.stringify(updateParams);
            var options = { method: 'POST',
                url: 'https://kudosapi.wl.r.appspot.com/awards/',
                headers: { 'cache-control': 'no-cache' },
                body:bodyString
                };
            request(options, function (error2, response2, body2) {
                if (error2) throw new Error(error2);
                res.redirect("/manager")

            });

    });

   //DELETE AWARD 
   app.get("/manager/deleteaward/:modNum", checkAuthenticated, requireRole("manager"), function(req, res){
        res.render("awardDelete.ejs", {pagetitle: "DeleteAward", AwardNum: req.params.modNum});
    });


    app.get("/manager/deleteaward/bye/:modNum", checkAuthenticated, requireRole("manager"), function(req, res){
        userRequest = "https://kudosapi.wl.r.appspot.com/awards/" + req.params.modNum;
        var options = { method: 'DELETE',
        url: userRequest,
        headers: 
        { 'cache-control': 'no-cache' } }; 
        request(options, function (error, response, body) {
        if (error){ throw new Error(error)}
        else{
            res.redirect("/manager")}
    });
    });

    //AWARD STATS
    app.get("/stats", checkAuthenticated, requireRole("admin"), function(req, res){
        //Chart1 = Local awards given
        //Chart2= Total awards given
        //Chart3= Awards by region
        //Chart4= Most Awarded Employees
        request("https://kudosapi.wl.r.appspot.com/awards/", function (error, response, body){
            //Parse Awards Data from API
            awardData = [];
            if(body.trim() === "sql: no rows in result set")
            {
                awardData = [];
            }
            else
            {
                awardData = JSON.parse(body);
            }
            //Create Array of the last 10 days
            var pastTen = [];
            curdate = new Date;
            curdate.setHours(0,0,0,0)
            pastTen[0] = curdate;
            for (var i = 1; i < 10; i++ ){
                pastTen[i] = new Date
                pastTen[i].setDate( pastTen[i-1].getDate() - 1 )
                pastTen[i].setHours(0,0,0,0)
            }

            //Create Arrays for chart 1 and 2
                chart1data = [];
                chart2data = [];

                //Fill chart1/chart2 arrays with date data and number of awards
                for(var j = 0; j < 10; j++)
                {
                    chart1data[j] = [];
                    chart2data[j] = [];
                    chart1data[j][0] = pastTen[j].getFullYear();
                    chart2data[j][0] = pastTen[j].getFullYear(); 
                    chart1data[j][1] = pastTen[j].getMonth();
                    chart2data[j][1] = pastTen[j].getMonth();
                    chart1data[j][2] = pastTen[j].getDate();
                    chart2data[j][2] = pastTen[j].getDate();
                    var countGlobal = 0;
                    var countLocal = 0;
                    for (var i = 0; i < awardData.length; i++)
                    {
                        var testDate = (new Date(awardData[i].createdon.Time));
                        testDate.setHours(0,0,0,0); 
                        matchDate = pastTen[j];
                        if(testDate.getTime()===matchDate.getTime())   
                                 {   
                                   //if match increment global counter   
                                   countGlobal++;   

                                    // awardData[i].creatorid = 13;
                                    if(req.user.id === awardData[i].createdby.userid)     
                                    {

                                     //if id match increment local counter  
                                     countLocal++;               
                                    }
                                 }   
                    }
                    chart2data[j][3] = countGlobal;
                    chart1data[j][3] = countLocal;
                }

            //Chart 3 data gathering
                  //get all regions
                var regions = []
                for(var j = 0; j < awardData.length; j++)
                {
                    //check if region is already added
                    var found = false;
                    for(var m = 0; m < regions.length; m++)
                    {   if(regions[m].id === awardData[j].region.regionid)
                        {found = true; break;}

                    }
                    if(!found){
                        tempObj = {name: awardData[j].region.regionname, id: awardData[j].region.regionid};
                        regions.push(tempObj);
                    }
                }
                  //count number of each region
                var chart3data = [];
                for(var j = 0; j < regions.length; j++)
                {
                    chart3data[j] = [];
                    chart3data[j][0] = regions[j].name;
                    var count = 0;
                    for(var i = 0; i < awardData.length; i++ )
                    {
                        if(awardData[i].region.regionid === regions[j].id)
                        {  count++;  }
                    }
                    chart3data[j][1] = count;
                }
            //Chart 4 data gathering
                  //get the recipient names
                var recipients = []
                for(var j = 0; j < awardData.length; j++)
                {
                    if(!recipients.includes(awardData[j].recipientname) ){
                        recipients.push(awardData[j].recipientname)
                    }
                }
                  //count number of recipient awards
                chart4objs = [];
                for(var j = 0; j < recipients.length; j++)
                {
                    chart4objs[j] = {};
                    chart4objs[j].name = recipients[j];
                    var count = 0;
                    for(var i = 0; i < awardData.length; i++ )
                    {
                        if(awardData[i].recipientname === recipients[j])
                        {  count++;  }
                    }
                    chart4objs[j].awards = count;
                }

                //sort recipients by award number
                chart4objs.sort((a,b) => (a.awards < b.awards) ? 1 : -1);

                // Select number of recipients to show
                awardsShown = 5;
                if(awardsShown > chart4objs.length)
                {awardsShown = chart4objs.length}

                //Transfer recipients that will be shown to new array
                chart4data = []
                for(var j= 0; j < awardsShown; j++)
                {
                    chart4data[j]=[];
                    chart4data[j][0] = chart4objs[j].name;
                    chart4data[j][1] = chart4objs[j].awards;
                }

                    chart1data =  JSON.stringify(chart1data);
                    chart2data =  JSON.stringify(chart2data);
                    chart3data =  JSON.stringify(chart3data);
                    chart4data =  JSON.stringify(chart4data);

            res.render("stats.ejs", {pagetitle: "Award Statistics", userNum: req.user.id, chart1data: chart1data, chart2data: chart2data, chart3data: chart3data, chart4data: chart4data});
        });
    });

    //QUERY SEARCH
    app.post("/queryAwards", checkAuthenticated, requireRole("admin"), function(req, res){
            // Create search query string from form params
            var query = req.body
            var urlstring = "https://kudosapi.wl.r.appspot.com/awards/search?"
            var paramAdded = 0;
            for(var key in query)
            {
                if(query[key] != ""){
                    if(paramAdded === 1)
                    {urlstring = urlstring + "&"}
                    urlstring = urlstring + key + "=" + query[key];
                    paramAdded = 1;
                }
            }
            //Send API search request
            request(urlstring, function (error, response, body){
                var searchResults = JSON.parse(body);
                if(body.trim()=="null"){searchResults = []};
                res.render("awardResults.ejs", {pagetitle: "Award Results", awardData: searchResults})
            });    
    });


    //UPDATE SIGNATURE
    app.get("/sig", checkAuthenticated, requireRole("manager"), function(req, res){
        res.render("sig.ejs", {pagetitle: "Update Signature"});
    });

    app.post("/sig", checkAuthenticated, requireRole("manager"), function(req, res){

        var updateParams ={ image:  req.body.svgEncode,
                            id: req.user.id} 

            try{
                //create svg file from svg base64 encode in "public/signatures" folder
                base64Img.img("data:image/svg;base64," + updateParams.image, "public/signatures", "sig" + updateParams.id, function(err, filepath)
                {
                    //convert from svg to png
                    pathtosave = "public/signatures/sig"+req.user.id+".svg";
                    saveas = "public/signatures/sig"+req.user.id+".png"
                    svg2img(pathtosave, function(error, buffer) {
                        fs.writeFileSync(saveas, buffer);

                        //send png in request
                        var pngReadStream = fs.createReadStream("public/signatures/sig" +req.user.id + ".png");
                        var fname = "sig" + req.user.id + ".png";
                        var options = { method: 'POST',
                        url: 'https://kudosapi.wl.r.appspot.com/users/managers/' + req.user.id +'/signature',
                        qs: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        headers: 
                         { 'cache-control': 'no-cache',
                           'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
                        formData: 
                         { image: 
                            { value: pngReadStream, //'fs.createReadStream("sig87.png")',
                              options: { filename: fname, contentType: null } } } };
                      
                        request(options, function (error, response, body) {
                            if (error) throw new Error(error);
                            res.render("sigdone.ejs", {pagetitle: "Update Signature", userNum: req.user.id, result: body.userid });
                        });

                     
                        
                    });
                });
            }    
            
            catch(error){    
                console.log(error)
                    res.render("sigdone.ejs", {pagetitle: "Update Signature", userNum: req.user.id, result: 0 })
                 }
        });




    //MANAGER UPDATE PASSWORD
    app.get("/account", checkAuthenticated, requireRole("manager"), function(req, res){  
        userRequest = "https://kudosapi.wl.r.appspot.com/users/managers/" + req.user.id;
        request(userRequest, function (error, response, managerbody){
            managerParsed = JSON.parse(managerbody)
            res.render("account.ejs", {pagetitle: "Update Account", type: JSON.stringify(req.user.type), man : managerParsed, msg: ""});
        });    
    });

    app.post("/accountpass", checkAuthenticated, requireRole("manager"), async function(req, res){
        try{    //hash new password
                newpassword = await bcrypt.hash(req.body.newpass, 10);
                //request user information
                userRequest = "https://kudosapi.wl.r.appspot.com/users/" + req.user.type +"s/" + req.user.id;
                request(userRequest, function (error2, response2, body2){
                    // throw request to get current user hash'
                    var userdata= JSON.parse(body2)
                    userRequest = "https://kudosapi.wl.r.appspot.com/users/" + userdata.email ;
                    request(userRequest, function (error, response, body){
                        bodyParsed = JSON.parse(body);
                        //compare current pass to current hash
                        bcrypt.compare(req.body.currentpass, bodyParsed.password, function(err, result){
                            //If customer password matches
                            if(result == true){
                                        var updateParams = {
                                        email: bodyParsed.email,
                                        password: newpassword
                                        };
                                        //check if user gave new firstname    
                                        if(req.body.newfn === ""){
                                            updateParams.firstname = userdata.firstname;
                                        }else{
                                            updateParams.firstname = req.body.newfn;
                                        }
                                        //check if user gave new lastname
                                        if(req.body.newln === ""){
                                            updateParams.lastname = userdata.lastname;
                                        }else{
                                            updateParams.lastname = req.body.newln;
                                        }
                                        //Request password change
                                        bodyString = JSON.stringify(updateParams);
                                        var options = { method: 'PUT',
                                        url: 'https://kudosapi.wl.r.appspot.com/users/'+ req.user.type + "s/" +req.user.id,
                                        headers: { 'cache-control': 'no-cache' },
                                        body:bodyString
                                        };   
                                        request(options, function (error3, response3, body3) {
                                            if (error3) throw new Error(error3);
                                            res.redirect("/manager");     
                                        });
                                
                            }
                            //Current password failed to match,
                            else{
                                userRequest = "https://kudosapi.wl.r.appspot.com/users/managers/" + req.user.id;
                                request(userRequest, function (error, response, managerbody){
                                    managerParsed = JSON.parse(managerbody)
                                    res.render("account.ejs", {pagetitle: "Update Account", type: JSON.stringify(req.user.type), man : managerParsed, msg: "PASSWORD FAILED TO MATCH"});
                                });    
                            }
    
                        });
                        
                        

                    });








                    });   

        }
        catch(error){
            console.log(error);
            redirect("/badrequest")
        }    
    });

    //LOGOUT
        app.get("/logout", function(req,res){
            req.logout();
            res.redirect("/login")
        });

    // BADREQUEST
        app.get("/badrequest", function(req,res){
            res.send("ERROR 424 - Dependency Request Failed \nSorry for the inconvenience. Please wait a second and try again.")
        });
    // 404    
        app.get("/*", function(req,res){
            res.send("Request not Found! 404 Bro")
        });


//================LISTEN===============================
    const PORT = process.env.PORT || 31112;
    app.listen(PORT, function(){
        console.log("Server started on port", PORT)
    });

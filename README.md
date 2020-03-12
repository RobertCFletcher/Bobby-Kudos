Kudos Server

To run the server you can either navigate to the directory and run:
  node server.js
    or
  npm run devstart 
    (this begins the app using nodemon to auto restart after any dev changes)
   
The server will either start on a port definied by an environment variable or will default to a hardcoded port number

A live version of the web app is hosted on heroku. 
https://kudos-employee.herokuapp.com/

Two account types are available to on the platform:

ADMIN ACCOUNT
  An admin account is able to create, modify, and delete both admin and manager accounts.
  The admin is also able to monitor the use of the platform and the distribution of awards including a search function.
  
  sample admin account:
  admin@test.com
  
  password:
  1234
 
MANAGER ACCOUNT
  Manager Accounts are able to create, view, and delete employee awards
  Managers also are able to design a signature and update their account information. 
  
  sample manager account:
  manager@test.com
  
  Password:
  1234

Kudos

manager accounts are able to be created on the create page. 
manager accounts can be authenticated. Note passwords will only work if the bcrypt hash is what is stored in database.
Any password that was directly entered into the database will not authenticate. 
Plain text passwords entered directly into database will not work

Sample Manager login:

man@serv

1234

This will allow access to the manager page

Admin accounts can now also be created on the create page.
When deployed, the create page will require admin authentication, but currently in dev it is open. 
Like manager accounts, only admin accounts that contain a hashed password in the database will be authenticated.
Plain text passwords entered directly into database will not work

Sample Admin login:

mon@admin.com

1234



Sart server with nodemon with "npm run devstart"
Server is hardcoded to run on port 31112 unless env var PORT is definied. 

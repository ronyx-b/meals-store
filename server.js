/****************************************************************************************
* WEB322 – Assignment 03-05
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. 
* No part of this assignment has been copied manually or electronically from any other 
* source (including 3rd party web sites) or distributed to other students.
*
* Name: _Rony A. Boscan_Leon___ Student ID: _136-346-194____ Date: _10-12-2020___________
*
* Online (Heroku, https://...) Link: _https://glacial-temple-81832.herokuapp.com/ _______
*
* GitHub or Bitbucket repo Link: _https://github.com/ronyx-b/web322-assignment __________
*
****************************************************************************************/

// initializing server resources
const express = require("express"); // Express
const app = express();
const dotenv = require('dotenv'); // Dot Env
dotenv.config();
const path = require("path"); // Path
const exphbs = require('express-handlebars'); // Handlebars
app.engine('.hbs', exphbs({ 
  extname: '.hbs', 
  defaultLayout: 'main', 
  helpers: {
    currency: function (amount) { return dataService.toCurrencyString(amount); },
    multiply: function(value1, value2){ return (Number(value1) * Number(value2)); }
  }
}));
app.set('view engine', '.hbs');
const mongoose = require("mongoose"); // Mongoose/MongoDB/Atlas
/* const bodyParser = require('body-parser'); // Body Parser  // Replaced by Multer
app.use(bodyParser.urlencoded({ extended: true })); */
const multer = require("multer"); // Multer (Multipart Form Processing)
const fs = require("fs"); // File System -> For image deletion
const nodemailer = require('nodemailer'); // Node Mailer
const clientSessions = require("client-sessions"); // Client Session
const bcrypt = require('bcryptjs'); // Encryption
const HTTP_PORT = process.env.PORT || 8080; // Port for express server
const dataService = require("./data-service.js"); // Data service

// call this function after the http server starts listening for requests
function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
}

// Settings for the session
app.use(clientSessions({
  cookieName: "session",
  secret: "web322assignment_raboscan-leon_136346194",
  duration: 30 * 60 * 1000, // Duration of 30 minutes
  activeDuration: 10 * 60 * 1000 // extended by 10 minutes
}));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: "./public/meals/",
  filename: function (req, file, cb) { cb(null, file.originalname); }
});
const upload = multer({ storage: storage });

// setup functions for sending email
var transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.googlemail.com', //'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports (like port 25)
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PASS
  },
  tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false
  },
});

function sendCustomMail(mailOptions) {
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log('Email sending function has caused error!: ' + error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Create greeting email message
function createGreetingEmailMessage(formData) {
  let htmlString = "<span style=\"font-family:verdana;\"><p>Dear " + formData.fname + " " + formData.lname + "</p>";
  htmlString += "<p>We want to welcome you to our services in the Meals Packages Store</p>";
  htmlString += "<p>As a confirmation, here is the information we gathered from you for the creation of your account. ";
  htmlString += "You can always update your information by accessing your account's dashboard.<p>";
  htmlString += "<ul>";
  htmlString += "<li><strong>First Name:</strong> " + formData.fname + "</li>";
  htmlString += "<li><strong>Last Name:</strong> " + formData.lname + "</li>";
  htmlString += "<li><strong>Email:</strong> " + formData.email + "</li>";
  htmlString += "<li><strong>Address:</strong> " + formData.address + "</li>";
  htmlString += "<li><strong>City:</strong> " + formData.city + "</li>";
  htmlString += "<li><strong>Postal Code:</strong> " + formData.postal + "</li>";
  htmlString += "</ul>";
  htmlString += "<p>Yours sincerely... the Meals Packages Store team</p><p>Visit our store at ";
  htmlString += "<a href=\"https://glacial-temple-81832.herokuapp.com/\">https://glacial-temple-81832.herokuapp.com/</a></p></span>";
  return htmlString;
}

// Function for ensuring login access dashboard and other services
function ensureLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Function for ensuring access to data clerks
function ensureClerk(req, res, next) {
  if (typeof(req.session.user) !== 'undefined' && req.session.user.role == "clerk") {
    next();
  } else {
    res.redirect("/dashboard");
  }
}

// Function for ensuring access to customers
function ensureCustomer(req, res, next) {
  if (typeof(req.session.user) !== 'undefined' && req.session.user.role == "customer") {
    next();
  } else {
    res.redirect("/dashboard");
  }
}

// Setting views and form processing

// setup virtual directory for public (static) elements
app.use('/public', express.static(path.join(__dirname, 'public')));

// setup route for the home page
app.get("/", function(req,res){
  dataService.getTopProducts()
  .then((meals) => {
    res.render('home', {
      user: ((req.session.user)? req.session.user : false),
      customer: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "customer"),
      clerk: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "clerk"),
      data: meals,
      page: {title: 'Home', home: true},
      layout: "main"
    });
  })
  .catch((err) => {
    console.log("There was an error loading packages: " + err);
    res.render('home', {
      user: ((req.session.user)? req.session.user : false),
      customer: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "customer"),
      clerk: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "clerk"),
      data: {},
      page: {title: 'Home', home: true},
      layout: "main"
    });
  });
});

// setup route for the Meals Package page
app.get("/packages", function(req,res){
  dataService.getAllProducts()
  .then((meals) => {
    res.render('packages', {
      user: ((req.session.user)? req.session.user : false),
      customer: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "customer"),
      clerk: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "clerk"),
      data: meals,
      page: {title: 'Packages', packages: true},
      layout: "main"
    });
  })
  .catch((err) => {
    console.log("There was an error loading packages: " + err);
    res.render('packages', {
      user: ((req.session.user)? req.session.user : false),
      customer: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "customer"),
      clerk: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "clerk"),
      data: {},
      page: {title: 'Packages', packages: true},
      layout: "main"
    });
  });
});

// setup route for the registration page
app.get("/register", function(req,res){
  if (req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render('register', {
      data: null,
      page: {title: 'Register', register: true},
      layout: "main"
    });
  }
});

// setup route for the login page
app.get("/login", function(req,res){
  if (req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render('login', {
      data: null,
      page: {title: 'Login', login: true},
      layout: "main"
    });
  }
});

// setup route for the about page
app.get("/about", function(req,res){
  res.render('about', {
    page: {title: 'About', about: true},
    user: ((req.session.user)? req.session.user : false),
    customer: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "customer"),
    clerk: (typeof(req.session.user) !== 'undefined' && req.session.user.role == "clerk"),
    layout: 'main'
  });
});

// setup route for the dashboard page
app.get("/dashboard", ensureLogin, function(req,res){
  res.render('dashboard', {
    user: req.session.user,
    customer: (req.session.user.role == "customer"),
    clerk: (req.session.user.role == "clerk"),
    page: {title: 'Dashboard', dashboard: true},
    layout: "main"
  });
});

// set route for the data clerk backoffice
app.get("/backoffice", ensureClerk, function(req,res){
  dataService.getAllProducts()
  .then((meals) => {
    res.render('backoffice', {
      user: req.session.user,
      clerk: (req.session.user.role == "clerk"),
      data: meals,
      page: {title: 'Backoffice', backoffice: true},
      layout: "main"
    });
  })
  .catch(() => {
    res.render('backoffice', {
      user: ((req.session.user)? req.session.user : false),
      clerk: (req.session.user.role == "clerk"),
      data: {},
      page: {title: 'Backoffice', backoffice: true},
      layout: "main"
    });
  });
});

// set route for adding a meal module
app.get("/add_meal", ensureClerk, function(req,res){
  dataService.getNewCode()
  .then((code) => { // change meals for code
    res.render('meal_module', {
      user: req.session.user,
      clerk: (req.session.user.role == "clerk"),
      data: {formData: {code: code}},
      page: {title: 'Add a Meal', add_meal: true},
      layout: "main"
    });
  })
  .catch(() => {
    res.redirect('/backoffice');
  });
});

// set route for editing a meal module
app.get("/edit_meal", ensureClerk, function(req,res){
  dataService.getProductByID(req.query.code)
  .then((meal) => {
    meal.current_image_url = meal.image_url; // Added field to show current image as opposed to new/edited
    res.render('meal_module', {
      user: req.session.user,
      clerk: (req.session.user.role == "clerk"),
      data: {formData: meal},
      page: {title: 'Edit a Meal', edit_meal: true},
      layout: "main"
    });
  })
  .catch(() => {
    res.redirect('/backoffice');
  });
});

// setup route for the order/shopping cart page
app.get("/order", ensureCustomer, function(req,res){
  let codes = [];
  req.session.user.cart.items.forEach(product => { codes.push(product.code); });
  dataService.getOrderProducts(codes)
  .then((meals) => {
    meals.forEach(meal => {
      meal.qty = 0;
      req.session.user.cart.items.forEach(inCart => {
        if (meal.code == inCart.code) { meal.qty += inCart.qty; }
      });
    });
    res.render('order', {
      user: req.session.user,
      customer: (req.session.user.role == "customer"),
      data: {meals: meals},
      page: {title: 'Your Order', order: true},
      layout: "main"
    });
  })
  .catch(() => {
    res.render('packages', {
      user: req.session.user,
      customer: (req.session.user.role == "customer"),
      data: {},
      page: {title: 'Your Order', order: true},
      layout: "main"
    });
  });
});

// setup route for login out / Kill session
app.get("/logout", function(req, res) {
  req.session.reset();
  res.redirect("/");
});

// setup method for processing login submission -> redirect to dashboard
app.post("/login", upload.none(), function(req,res){
  var formData = req.body;
  var errors = dataService.validateLogin(formData);
  if (!errors.isValid) {
    res.render('login', {
      data: {"formData": formData, "errors": errors},
      page: {title: 'Login', login: true},
      layout: "main"
    });
  } else {
    // run login function
    dataService.login(req.body.email, req.body.password)
    .then(user => {
      // if valid create session
      console.log("Login user: " + user.email);
      req.session.user = {
        email: user.email,
        fname: user.first_name,
        lname: user.last_name,
        address: user.address,
        city: user.city,
        postal: user.postal,
        role: user.role
      };
      if(req.session.user.role && req.session.user.role=="customer") {
        req.session.user.cart = { items: [], subtotal: 0, taxes: 0, shipping: 0, total: 0 };
      }
      // then redirect to dashboard
      res.redirect("/dashboard"); 
    })
    .catch(error => {
      // handle invalid login
      res.render('login', {
        data: {"formData": formData, "noLogin": error},
        page: {title: 'Login', login: true},
        layout: "main"
      });
    });
  }
});

// setup method for processing registration submission -> redirect to dashboard
app.post("/register", upload.none(), function(req,res){
  var formData = req.body;
  var errors = dataService.validateRegistration(formData);
  if (!errors.isValid) {
    res.render('register', {
      data: {"formData": formData, "errors": errors},
      page: {title: 'Register', register: true},
      layout: "main"
    });
  } else { 
    // run user registration function
    dataService.register(formData)
    .then(function(){
      console.log("An email will be sent to the newly registered user...");
      // User registration successful, we send greeting email
      let htmlString = createGreetingEmailMessage(formData);
      let mailOptions = {
        from: 'rabl.webapps@gmail.com',
        to: formData.email,
        subject: 'Welcome ' + formData.fname + ' to our Meals Packages!',
        html: htmlString
      };
      sendCustomMail(mailOptions);
      // After sending email, we run login and create session
      dataService.login(formData.email, formData.password)
      .then(user => {
        // if valid create session
        console.log("Login user: " + user.email);
        req.session.user = {
          email: user.email,
          fname: user.first_name,
          lname: user.last_name,
          address: user.address,
          city: user.city,
          postal: user.postal,
          role: user.role
        };
        if(req.session.user.role && req.session.user.role=="customer") {
          req.session.user.cart = { items: [], subtotal: 0, taxes: 0, shipping: 0, total: 0 };
        }
        // then redirect to dashboard
        res.redirect("/dashboard"); 
      })
      .catch(error => {
        // handle invalid login
        res.render('register', {
          data: {"formData": formData, "noRegis": error},
          page: {title: 'Register', register: true},
          layout: "main"
        });
      });
    })
    .catch(error => {
      // handle invalid login
      res.render('register', {
        data: {"formData": formData, "noRegis": error},
        page: {title: 'Register', register: true},
        layout: "main"
      });
    });
  }
});

// setup method for adding a meal (with data validation)
app.post("/add_meal", ensureClerk, upload.single("image_url"), function(req,res){
  let mealData = req.body;
  mealData.image_url = (req.file)? req.file.originalname : "";
  let isNewMeal = true;
  let errors = dataService.validateMeal(mealData, isNewMeal);
  if (!errors.isValid) {
    if (mealData.image_url != "") {
      fs.unlink("./public/meals/" + mealData.image_url, (err) => { if (err) console.log(err); });
    }
    res.render('meal_module', {
      user: req.session.user,
      clerk: (req.session.user.role == "clerk"),
      page: {title: 'Add a Meal', add_meal: true},
      data: {"formData": mealData, "errors": errors},
      layout: "main"
    });
  } else {
    dataService.addMeal(mealData)
    .then((msg) => {
      console.log(msg);
      res.redirect("/backoffice");
    })
    .catch((err) => {
      console.log("There was an error adding the meal: " + err);
      res.redirect("/backoffice");
    });
  }
});

// setup method for editing a meal (with data validation)
app.post("/edit_meal", ensureClerk, upload.single("image_url"), function(req,res){
  let mealData = req.body;
  mealData.image_url = (req.file)? req.file.originalname : "";
  let isNewMeal = false;
  let errors = dataService.validateMeal(mealData, isNewMeal);
  if (!errors.isValid) {
    if (mealData.image_url != "") { // delete invalid file uploaded
      fs.unlink("./public/meals/" + mealData.image_url, (err) => { if (err) console.log(err); });
    }
    res.render('meal_module', {
      user: req.session.user,
      clerk: (req.session.user.role == "clerk"),
      data: {"formData": mealData, "errors": errors},
      page: {title: 'Edit a Meal', edit_meal: true},
      layout: "main"
    });
  } else {
    if (mealData.image_url != "" && mealData.image_url != mealData.current_image_url) { // delete old image file
      fs.unlink("./public/meals/" + mealData.current_image_url, (err) => { if (err) console.log(err); });
    }
    dataService.editMeal(mealData)
    .then((msg) => {
      console.log(msg);
      res.redirect("/backoffice");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/backoffice");
    });
  }
});

// setup method for deleting a meal
app.post("/delete_meal/:code", ensureClerk, function(req,res){
  let mealCode = req.params.code;
  dataService.getProductByID(mealCode)
  .then((meal) => {
    dataService.deleteMeal(meal.code)
    .then((msg) => {
      console.log(msg);
      fs.unlink("./public/meals/" + meal.image_url, (err) => { if (err) console.log(err); });
      res.redirect("/backoffice");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/backoffice");
    });
  })
  .catch((err) => {
    console.log(err);
    res.redirect("/backoffice");
  });
});

// setup method for adding or updating meals to shopping cart
app.post("/add-to-cart", ensureCustomer, upload.none(), function(req, res){
  let product = { // create product object from the form values
    code: req.body.code,
    name: req.body.name,
    price: req.body.price,
    qty: Number(req.body.qty)
  }
  if (req.session.user.cart.items.some(item => { return item.code == product.code })) { // check if the product already exists in cart
    req.session.user.cart.items.find(item => { return item.code == product.code }).qty += product.qty; // if exists adds to existing
  } else {
    req.session.user.cart.items.push(product); // if doesn't exists adds product to cart
  }
  req.session.user.cart.subtotal = 0;
  for (i = req.session.user.cart.items.length - 1; i >= 0; i--) { // Updates cart total and removes nulls
    if (req.session.user.cart.items[i].qty <= 0) {
      req.session.user.cart.items.splice(i, 1);
    } else {
      req.session.user.cart.subtotal += req.session.user.cart.items[i].price * req.session.user.cart.items[i].qty;
    }
  }
  req.session.user.cart.taxes = req.session.user.cart.subtotal * 0.13;
  req.session.user.cart.shipping = req.session.user.cart.subtotal * 0.05;
  req.session.user.cart.total = req.session.user.cart.subtotal + req.session.user.cart.taxes + req.session.user.cart.shipping;
  res.redirect("/order");
});

// setup method for processing checkout
app.post("/checkout", ensureCustomer, upload.none(), function(req, res){
  let formData = req.body;
  let user = req.session.user
  let shippingAddress = { name: '', street: '', city: '', postal: '' }
  if (formData.address_choice == "address_current") {
    shippingAddress.name = user.fname + " " + user.lname;
    shippingAddress.street = user.address;
    shippingAddress.city = user.city;
    shippingAddress.postal = user.postal; 
  } else {
    shippingAddress.name = formData.fname + " " + formData.lname;
    shippingAddress.street = formData.address;
    shippingAddress.city = formData.city;
    shippingAddress.postal = formData.postal; 
  }
  let htmlString = "<div style=\"font-family:verdana; max-width:600px; margin-left:auto; margin-right:auto\">\n";
  htmlString += "<p>Dear " + shippingAddress.name + "</p>\n";
  htmlString += "<p>Here are the details of your most recent order on the Meals Packages Store</p>\n";
  htmlString += "<table style=\"width:100%;\">\n";
  for (i = 0; i < user.cart.items.length; i++) {
    htmlString += "<tr><td>" + user.cart.items[i].name + "</td>\n";
    htmlString += "<td>" + user.cart.items[i].qty + "x " + dataService.toCurrencyString(user.cart.items[i].price) + "</td>\n";
    htmlString += "<td style=\"text-align:right;\">" + dataService.toCurrencyString(user.cart.items[i].qty * user.cart.items[i].price) + "</td></tr>\n";
  }
  htmlString += "</table>\n";
  htmlString += "<p><b>Shipping address:</b>\n"; 
  htmlString += "<br />" + shippingAddress.name + "<br />" + shippingAddress.street + "<br />"+ shippingAddress.city + ", " + shippingAddress.postal + "</p>\n";
  htmlString += "\n";
  htmlString += "<div style=\"text-align:right; margin-left:5px\">Cart Subotal: " + dataService.toCurrencyString(user.cart.subtotal) + "</div>\n";
  htmlString += "<div style=\"text-align:right; margin-left:5px\">Taxes: " + dataService.toCurrencyString(user.cart.taxes) + "</div>\n";
  htmlString += "<div style=\"text-align:right; margin-left:5px\">Shipping: " + dataService.toCurrencyString(user.cart.shipping) + "</div>\n";
  htmlString += "<div style=\"text-align:right; margin-left:5px; font-weight:bold\">Order Total: " + dataService.toCurrencyString(user.cart.total) + "</div>\n";
  htmlString += "<p>Yours sincerely... the Meals Packages Store team</p><p>Visit our store at \n";
  htmlString += "<a href=\"https://glacial-temple-81832.herokuapp.com/\">https://glacial-temple-81832.herokuapp.com/</a></p></div>\n";
  let mailOptions = {
    from: 'rabl.webapps@gmail.com',
    to: user.email,
    subject: 'Meals Packages Store Order Summary',
    html: htmlString
  };
  sendCustomMail(mailOptions);
  req.session.user.cart = { items: [], subtotal: 0, taxes: 0, shipping: 0, total: 0 }; 
  res.redirect("/dashboard");
});

// Handle all other requests
app.use((req, res) => {
  res.status(404).send("Page Not Found<br /><br /><a href=\"/\">Return Home</a>");
});

// setup http server to listen on HTTP_PORT
app.listen(HTTP_PORT, onHttpStart);
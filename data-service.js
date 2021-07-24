const mongoose = require("mongoose"); // Mongoose/MongoDB/Atlas
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs'); // Encryption

const dotenv = require('dotenv'); // Dot Env
dotenv.config();

const path = require("path"); // Path

mongoose.connect(process.env.MONGODB_CONN_STR, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

// Define schemas
let userSchema = new Schema({
  "email": {
    "type": String,
    "unique": true
  },
  "first_name": String,
  "last_name": String,
  "address": String,
  "city": String,
  "postal": String,
  "password": String, // Store encrypted -> Hash
  "role": {
    "type": String,
    "default": "customer"
  }
});
let User = mongoose.model("users", userSchema);

let mealSchema = new Schema({
  "code": {
    "type": Number,
    "unique": true
  },
  "name": String,
  "description": String,
  "price": Number,
  "category": String,
  "num_meals": Number,
  "image_url": {
    "type": String,
    "unique": true
  },
  "is_top": {
    "type": Boolean,
    "default": false
  }
});
let Meal = mongoose.model("meals", mealSchema);

// ******************** LOGIN FUNCTION ********************
module.exports.login = function(login_email, login_pass) {// async function(login_email, login_pass) {
  return new Promise(function(resolve,reject){
    User.findOne({ email: login_email })
    .exec()
    .then((user) => {
      if(!user) {
        reject("There is no user registered with the given email");
      } else {
        jsUser = user.toObject();
        // validate password
        bcrypt.compare(login_pass, jsUser.password).then((result) => {
          if (result === true) {
            resolve(jsUser);
          } else {
            reject("Wrong password");
          }
        });
      }
      //process.exit();
    })
    .catch((err) => {
      reject("There was an error validating the password: " + err);
    });
  });
};

// ******************** REGISTER FUNCTION ********************
module.exports.register = function(userData) {
  return new Promise(function(resolve,reject){
    User.findOne({ email: userData.email })
    .exec()
    .then((user) => {
      if(!user) {
        // transform user form data to database model
        let data = {
          email: userData.email,
          first_name: userData.fname,
          last_name: userData.lname,
          address: userData.address,
          city: userData.city,
          postal: userData.postal,
          password: userData.password, // Store encrypted -> Hash
          role: 'customer'
        };
        // Encrypt user password and save user
        bcrypt.hash(data.password, 10).then(hash=>{
          data.password = hash;
          let newUser = new User(data);
          newUser.save((err) => {
            if(err) {
              reject("There was an error creating the user: " + err);
            } else {
              console.log("The new user was saved to the users collection");
              resolve();
            }
            //process.exit();
          });
        })
        .catch(err=>{
          console.log("There was an error: " + err);
          reject("There was an error: " + err);
        });
      } else {
        reject("There is a user already registered with the given email");
      }
    })
    .catch((err) => {
      console.log("There was an error: " + err);
      reject("There was an error: " + err);
    });
  });
};

// ******************** LOAD ALL MEALS FUNCTION ********************
module.exports.getAllProducts = function() {
  return new Promise(function(resolve,reject){
    Meal.find({})
    .sort('code')
    .exec()
    .then((meals) => {
      meals = meals.map(meal => meal.toObject());
      resolve(meals);
    })
    .catch((err) => {
      reject(err);
    });
  });
};

// ******************** GET MEAL BY CODE FUNCTION ********************
module.exports.getProductByID = function(code) {
  return new Promise(function(resolve,reject){
    Meal.findOne({code: code})
    .exec()
    .then((meal) => {
      meal = meal.toObject();
      resolve(meal);
    })
    .catch((err) => {
      reject(err);
    });
  });
};

// ******************** GET TOP MEALS FUNCTION ********************
module.exports.getTopProducts = function() {
  return new Promise(function(resolve,reject){
    Meal.find({is_top: true})
    .sort('code')
    .exec()
    .then((meals) => {
      meals = meals.map(meal => meal.toObject());
      resolve(meals);
    })
    .catch((err) => {
      reject(err);
    });
  });
};

// ******************** GET TOP MEALS FUNCTION ********************
module.exports.getOrderProducts = function(codes) {
  return new Promise(function(resolve,reject){
    Meal.find({ code: { $in: codes } })
    .sort('code')
    .exec()
    .then((meals) => {
      meals = meals.map(meal => meal.toObject());
      resolve(meals);
    })
    .catch((err) => {
      reject(err);
    });
  });
};

// ******************** GET NEW MEAL CODE FUNCTION ********************
module.exports.getNewCode = function() {
  return new Promise(function(resolve,reject){
    Meal.find()
    .sort('-code')
    .limit(1)
    .exec()
    .then((meal) => {
      let new_code = meal[0].code + 1;
      resolve(new_code);
    })
    .catch((err) => {
      reject(err);
    });
  });
};

// ******************** ADD NEW MEAL FUNCTION ********************
module.exports.addMeal = function(mealData) {
  return new Promise(function(resolve,reject){
    Meal.findOne({ image_url: mealData.image_url })
    .exec()
    .then((meal) => {
      if(!meal) {
        let data = {
          code: mealData.code,
          name: mealData.name,
          description: mealData.description,
          price: mealData.price,
          category: mealData.category,
          num_meals: mealData.num_meals,
          image_url: mealData.image_url,
          is_top: mealData.is_top
        };
        newMeal = new Meal(data);
        newMeal.save((err, data) => {
          if (err) {
            if (err.code == 11000) {
              reject("Meal code already taken");
            } else {
              reject(err);
            }
          } else {
            resolve("New meal added to the collection (code: " + data.code + ")");
          }
        });
      } else {
        reject("image_url already taken");
      }
    });
  });
};

// ******************** EDIT MEAL FUNCTION ********************
module.exports.editMeal = function(mealData) {
  console.log("Edit meal:");
  console.log(mealData);
  if (mealData.image_url == "") mealData.image_url = mealData.current_image_url;
  return new Promise(function(resolve,reject){
    Meal.updateOne(
      { code: mealData.code},
      { $set: {
        name: mealData.name,
        description: mealData.description,
        price: mealData.price,
        category: mealData.category,
        num_meals: mealData.num_meals,
        is_top: mealData.is_top,
        image_url: mealData.image_url
      }}
    )
    .exec()
    .then(() => {resolve("Meal edited");})
    .catch((err) => {reject("Error editing meal: " + err);});
  });
};

// ******************** DELETE MEAL FUNCTION ********************
module.exports.deleteMeal = function(code) {
  return new Promise(function(resolve,reject){
    Meal.deleteOne({code: code})
    .exec()
    .then(() => {
      resolve("Meal code " + code + " deleted");
    })
    .catch((err) => {
      reject("There was an error deleting the meal: " + err);
    });
  });
};

// ******************** ADD/EDIT MEAL VALIDATION FUNCTION ********************
module.exports.validateMeal = function(mealData, isNewMeal) {
  let errors = {
    isValid: true, 
    name: "",
    description: "", 
    price: "", 
    num_meals: "",
    image_url: ""
  };
  let file_ext = path.extname(mealData.image_url);
  if (mealData.name == "") {
    errors.name = "Meal name must not be empty";
  }
  if (mealData.description == "") {
    errors.description = "Meal description must not be empty";
  }
  if (mealData.price == "" || isNaN(mealData.price)) {
    errors.price = "Meal price must be a number";
  }
  if (mealData.num_meals == "" || isNaN(mealData.num_meals) || !Number.isInteger(Number(mealData.num_meals))) {
    errors.num_meals = "Number of meals must be an integer number";
  }
  if (isNewMeal && mealData.image_url == "") {
    errors.image_url = "You must choose an image file for the meal";
  } else if (isNewMeal && (file_ext != ".jpg" && file_ext != ".jpeg" && file_ext != "gif" && file_ext != "png" && file_ext != "bmp" && file_ext != "svg")) {
    errors.image_url = "File must be an image (have one of the following extensions: \".jpg\", \".jpeg\", \".gif\", \".png\", \".bmp\", \".svg\")";
  }/*  else {
    Meal.findOne({ image_url: mealData.image_url })
    .exec()
    .then((meal) => { if (meal) { errors.image_url = "Duplicate image file name, choose another file name" }  })
    .catch((err) => { console.log("Error checking for duplicate image file: " + err); })
    .finally(() => { return errors; });
  } */
  if (errors.name != "" || errors.description != "" || errors.price != "" || errors.num_meals != "" || errors.image_url != "") {
    errors.isValid = false;
  }
  return errors;
};

// ******************** LOGIN FORM VALIDATION FUNCTION ********************
module.exports.validateLogin = function(formData) {
  var errors = {isValid: true, email: "", password: ""};
  checkNullEmail(formData, errors);
  checkNullPassword(formData, errors);
  return errors;
};

// ******************** REGISTER FORM VALIDATION FUNCTIONS ********************
module.exports.validateRegistration = function(formData) {
  var errors = {
    isValid: true, 
    fname: "", 
    lname: "", 
    email: "", 
    address: "", 
    city: "", 
    postal: "", 
    password: "", 
    passwordConfirm: ""
  };
  validateFName(formData, errors);
  validateLName(formData, errors);
  checkNullEmail(formData, errors);
  validateEmail(formData, errors);
  validateAddress(formData, errors);
  validateCity(formData, errors);
  validatePostal(formData, errors);
  checkNullPassword(formData, errors);
  validatePassword(formData, errors);
  validatePasswordConfirm(formData, errors);
  return errors;
};

// ******************** NEW ADDRESS IN CHECKOUT VALIDATION FUNCTION ********************
module.exports.validateNewAddress = function(formData) {
  var errors = {
    isValid: true, 
    fname: "", 
    lname: "", 
    address: "", 
    city: "", 
    postal: ""
  };
  validateFName(formData, errors);
  validateLName(formData, errors);
  validateAddress(formData, errors);
  validateCity(formData, errors);
  validatePostal(formData, errors);
  return errors;
};

function checkNullEmail(formData, errors) {
  if (!formData.email.trim()) {
    errors.isValid = false;
    if (errors.email != "") errors.email += ", ";
    errors.email += "Email is required";
  }
};

function checkNullPassword(formData, errors) {
  if (!formData.password.trim()) {
    errors.isValid = false;
    if (errors.password != "") errors.password += ", ";
    errors.password += "Password is required";
  }
};

function validateFName(formData, errors) {
  let fname = formData.fname.toLowerCase().trim();
  let regex = new RegExp(/[^(a-z|\ |\.|\-|\')]/gi);
  let len = fname.length
  if (len == 0) {
    errors.isValid = false;
    if (errors.fname != "") errors.fname += ", ";
    errors.fname += "First Name is required";
  } else if (len < 2) {
    errors.isValid = false;
    if (errors.fname != "") errors.fname += ", ";
    errors.fname += "First Name needs to be at least two characters long";
  }
  if (regex.test(fname)) {
    errors.isValid = false;
    if (errors.fname != "") errors.fname += ", ";
    errors.fname += "First Name can only have valid characters (letters or the characters \".\", \"-\", \"\'\")";
  }
};

function validateLName(formData, errors) {
  let lname = formData.lname.toLowerCase().trim();
  let regex = new RegExp(/[^(a-z|\ |\.|\-|\')]/gi);
  let len = lname.length
  if (len == 0) {
    errors.isValid = false;
    if (errors.lname != "") errors.lname += ", ";
    errors.lname += "Last Name is required";
  } else if (len < 2) {
    errors.isValid = false;
    if (errors.lname != "") errors.lname += ", ";
    errors.lname += "Last Name needs to be at least two characters long";
  }
  if (regex.test(lname)) {
    errors.isValid = false;
    if (errors.lname != "") errors.lname += ", ";
    errors.lname += "Last Name can only have valid characters (letters or the characters \".\", \"-\", \"\'\")";
  }
};

function validateEmail(formData, errors) {
  let email = formData.email.toLowerCase().trim();
  let regex = new RegExp(/[^(\w|\@|\.|\-)]/gi);
  let len = email.length
  let amp0 = email.indexOf('@');
  let amp1 = email.lastIndexOf('@');
  let dot = email.lastIndexOf('.');
  if (regex.test(email)) { 
    errors.isValid = false;
    if (errors.email != "") errors.email += ", ";
    errors.email += "Email can only have valid characters (a-z, 0-9, \".\", \"-\", \"_\")";
  }
  if (len > 0 && (amp0 < 2 || amp0 != amp1 || amp1 > (len - 6) || dot < (amp1 + 3))) {
    errors.isValid = false;
    if (errors.email != "") errors.email += ", ";
    errors.email += "Email needs to be properly formatted (xx@xx.xx)";
  }
};

function validateAddress(formData, errors) {
  let address = formData.address.toLowerCase().trim();
  let len = address.length
  if (len == 0) {
    errors.isValid = false;
    if (errors.address != "") errors.address += ", ";
    errors.address += "Address is required";
  } else if (len < 2) {
    errors.isValid = false;
    if (errors.address != "") errors.address += ", ";
    errors.address += "Address needs to be at least two characters long";
  }
};

function validateCity(formData, errors) {
  let city = formData.city.toLowerCase().trim();
  let len = city.length
  if (len == 0) {
    errors.isValid = false;
    if (errors.city != "") errors.city += ", ";
    errors.city += "City is required";
  } else if (len < 2) {
    errors.isValid = false;
    if (errors.city != "") errors.city += ", ";
    errors.city += "City needs to be at least two characters long";
  }
};

function validatePostal(formData, errors) {
  let postal = formData.postal.toLowerCase().trim();
  let len = postal.length;
  let regex = new RegExp(/^[a-z]\d[a-z][ -]?\d[a-z]\d$/);
  if (len == 0) {
    errors.isValid = false;
    if (errors.postal != "") errors.postal += ", ";
    errors.postal += "Postal Code is required";
  } else if (!regex.test(postal)) { 
    errors.isValid = false;
    if (errors.postal != "") errors.postal += ", ";
    errors.postal += "Postal Code needs to follow the format X0X 0X0";
  }
};

function validatePassword(formData, errors) {
  let password = formData.password;
  let regex = new RegExp(/[^(\w|\.|-|\+|\@|\#|\$|\%|\&|\*|\!|\?)]/gi);
  let len = password.length
  if (len > 0 && len < 6) {
    errors.isValid = false;
    if (errors.password != "") errors.password += ", ";
    errors.password += "Password needs to be at least six characters long";
  }
  if (regex.test(password)) {
    errors.isValid = false;
    if (errors.password != "") errors.password += ", ";
    errors.password += "Password can only have valid characters (letters, numbers, or special characters [._-+\@\#\$\%\&\*\!\?])";
  }
};

function validatePasswordConfirm(formData, errors) {
  let passw1 = formData.password;
  let passw2 = formData.passwordConfirm;
  if (passw1.length > 0 && passw2.length == 0) {
    errors.isValid = false;
    errors.passwordConfirm += "Password needs to be confirmed";
  } else if (passw1 != passw2) {
    errors.isValid = false;
    errors.passwordConfirm += "Passwords need to match";
  }
};

// ******************** TRANSFORM CURRENCY NUMBER INTO FORMATTED STRING FUNCTION ********************
module.exports.toCurrencyString = function (amount) {
  var i = parseFloat(amount);
  if(isNaN(i)) { i = 0.00; }
  var minus = '';
  if(i < 0) { minus = '-'; }
  i = parseInt((Math.abs(i) + .005) * 100) / 100;
  s = new String(i);
  if(s.indexOf('.') < 0) { s += '.00'; }
  if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
  if(s.indexOf('.') > 3 ) {
    commaIndex = s.indexOf('.') - 3;
    s = s.substring(0, commaIndex) + "," + s.substring(commaIndex, s.length);
  }
  while(s.indexOf('.') > 3 && (s.indexOf(',') < 0 || s.indexOf(',') > 3)) {
    if (s.indexOf(',') < 0) {
      commaIndex = s.indexOf('.') - 3;
    } else {
      commaIndex = s.indexOf(',') - 3;
    }
    s = s.substring(0, commaIndex) + "," + s.substring(commaIndex, s.length);
  }
  s = "$" + minus + s;
  return s;
};
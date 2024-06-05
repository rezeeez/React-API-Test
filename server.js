const express = require('express') //module for running express js
require('dotenv').config();//importing the env file
const app = express()//use in configuring routes to use http requests
const mongoose = require('mongoose') //database module
const Product = require('./models/productModel') //imported productModel from models folder with the userschema
const bcrypt = require('bcrypt'); //hashing  password
const User = require('./models/userModel'); //imported userModel from the models folder with the userschema
const jwt = require('jsonwebtoken'); //jsonwebtoken
const asyncHandler = require("express-async-handler");
const bodyParser = require('body-parser');//parsing info from data sent using http methods
const jwtKey = process.env.JWT_SECRET //secret key

// to read json data types from post
app.use(express.json()) 
app.use(bodyParser.json());


//setting the jwt to make sure that the user has a specific token that indicates user is admin or not
//add unique token to the Authorization to become an Admin in Post Man
const generateToken = (id) => {
  return jwt.sign({ id }, jwtKey, { expiresIn: '30d' }); 
};

//validates if the user logged in is a user or not
const isUser = (req, res, next) => {
  // Check if user is authenticated (you'll need to implement this logic)
  if (req.user) {
      next(); // Proceed to the next middleware or route handler
  } else {
      return res.status(401).json({ message: 'Unauthorized: You need to be logged in to perform this action.' });
  }
};

//token verifer if the token generated in the Postman will match the authoriaztion bearer
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Missing token' });
  }

  try {
    //verify the token by inputting the token and jwtKey
    const decoded = jwt.verify(token, jwtKey);

    req.user = decoded;

    next(); 
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};


// routes /users/register which registers a new user
app.post('/users/register', asyncHandler(async (req, res) => {
  const { email, password, password_confirmation, role } = req.body;

  if (!email || !password || !password_confirmation || !role) {
      res.status(400);
      throw new Error('Please include all fields');
  }
  //validating if passwords match from the password parameter and password_confirmation parameter
  if (password !== password_confirmation) {
      res.status(400);
      throw new Error('Passwords do not match');
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
      res.status(400);
      throw new Error('User already exists');
  }
  //creating salts to hash passwords
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
      email,
      password: hashedPassword,
      role,
  });

  if (user) {
      res.status(201).json({
          _id: user.id,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
      });
  } else {
      res.status(400);
      throw new Error('Invalid user data');
  }
}));

//view all users admin only previleges
app.get('/view/users',verifyToken, asyncHandler(async (req, res) => {
  //checks if user is authenticated
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
      res.status(401);
      throw new Error('Unauthorized: Missing token');
  }

  try {
      // Verify token
      const decoded = jwt.verify(token, 'your_jwt_secret');

      // Check if user is an admin
      if (decoded.role !== 'admin') {
          res.status(403);
          throw new Error('Forbidden: Insufficient privileges');
      }

      // If user is admin, fetch and return all users
      const users = await User.find().select('-password');
      res.json(users);
  } catch (error) {
      res.status(401);
      throw new Error('Unauthorized: Invalid token');
  }
}));

//route of authenticating a user
app.post('/users/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //finds if user is registered
  const user = await User.findOne({ email });
  //checks if all fields are match
  if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
          _id: user.id,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
      });
  } else {
      res.status(400);
      throw new Error('Invalid email or password');
  }
}));

//route of getting user information by id
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  //checking if user exists then will show user info
  if (user) {
      res.json(user);
  } else {
      res.status(404);
      throw new Error('User not found');
  }
}));

//route of updating user information by id
app.put('/users/:id', isUser, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  //if user exists it will update the user information 
  if (user) {
      user.email = req.body.email || user.email;
      if (req.body.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(req.body.password, salt);
      }
      user.role = req.body.role || user.role;

      const updatedUser = await user.save();
      res.json({
          _id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
      });
  } else {
      res.status(404);
      throw new Error('User not found');
  }
}));

//route of deleting user by id
app.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  //if user is found by id it will delete the user
  if (user) {
      await user.remove();
      res.json({ message: 'User removed' });
  } else {
    //if user not found it will show this message
      res.status(404);
      throw new Error('User not found');
  }
}));


//route to inserting products into database 
app.post('/product', verifyToken, async(req, res) => {
  try {
    // Extract the ID of the logged-in user from the request
    const userId = req.user._id;

    // Create a new product object with the request body and the createdBy field set to the user ID
    const product = new Product({
        ...req.body,
        createdBy: userId
    });

    // Save the product to the database
    await product.save();

    res.status(200).json(product);
} catch (error) {
    console.error(error.message);
    res.status(500).json({message: error.message});
}

});

//route of viewing products
app.get('/products', async(req, res) => {
  try{
 //checks the the logged user from the request
 const userId = req.user._id;

 //creates object with the request body and the createdBy field set to the user id who owns the product
 const product = new Product({
     ...req.body,
     createdBy: userId
 });

 //save the created product in the database
 await product.save();
 res.status(200).json(product);
  }
  catch (error){
    console.log(error.message); 
    res.status(500).json({message: error.message})  
  }
});

//route of updating method of products
//only updates if the it is a registered user
app.put('/products/:id', isUser, verifyToken, async(req, res) => {
  try{
    const {id} = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body);
    if(!product){
      //If products cannot be updated it will show this message 
      return res.status(404).json({message: `cannot find product with the ID of ${id}`});
    }
      const updatedProduct = await Product.findById(id);
      res.status(200).json(product);
  }
  catch (error){
    res.status(500).json({message: error.message})  
  }
});

//route of post method for finding products by ID from the database
app.get('/products/:id', async(req, res) => {
  try{
    const {id} = req.params;
    const product = await Product.findById(id);
    res.status(200).json(product);
  }
  catch (error){
    console.log(error.message); 
    res.status(500).json({message: error.message})  
  }
});


app.delete('/products/:id', isUser, verifyToken, async (req, res) => {
  try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
          return res.status(404).json({ message: `Cannot find product with the ID of ${id}` });
      }

      //checks if logged in user is the owner of the product
      if (product.createdBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this product' });
      }

      //will delete if the logged in user is the owner 
      await product.remove();
      res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: error });
  }
});


//database connection to mongoose
mongoose.connect('mongodb+srv://admin:adminpass16@assessmentdb.d6pf073.mongodb.net/Assessment-API?retryWrites=true&w=majority&appName=AssessmentDB')
.then(() => {
  console.log('Connected to Database') //checking using console log if app is connected to database
  app.listen(8080, () => { //port 8080 is used in the http server
    console.log('App is running on port 8080')
  }) 
}).catch((error) => {
  console.log(error)
})


const mongoose = require('mongoose');

//user schema for the user information in the database
const userSchema = new mongoose.Schema({
    email: { 
      type: String, 
      required: true, 
      unique: true },
    password: { 
      type: String, 
      required: true },
    role: { 
      type: String, 
      required: true, enum: ['user', 'admin'] }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
//exporting the information of the users into the database

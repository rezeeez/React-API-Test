const express = require('express');
const mongoose  = require("mongoose");


//user schema for the product information in the database
const productSchema = new mongoose.Schema({

    product_name: {
      type: String,
      required: [true, "Enter valid product name"]
    },
    product_description: {
      type: String,
      required: true,
    },
    price:{
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    product_tag: {
      type: Array,
      required: true
    }

  }

)

const Product = mongoose.model('Product', productSchema);
//product model
module.exports = Product;
//saving products into database


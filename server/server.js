const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// תפריט המערכת (מקור האמת)
const MENU = {
  pizzas: {
    'Margherita': 35,
    'Vegetarian': 39,
    'Pepperoni': 42
  },
  sizes: {
    'Small': 0,
    'Medium': 8,
    'Large': 15
  },
  toppings: {
    'Olives': 4,
    'Mushrooms': 4,
    'Corn': 4,
    'Onion': 4.5,
    'Extra Cheese': 3.5
  }
};


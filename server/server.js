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

let orders = [];
let nextOrderId = 1001;

const VALID_STATUS_TRANSITIONS = {
  'new': ['preparing'],
  'preparing': ['ready'],
  'ready': ['delivered'],
  'delivered': []
};

// GET /api/menu
app.get('/api/menu', (req, res) => {
  res.json(MENU);
});

// POST /api/orders - יצירת הזמנה עם וולידציה מתוקנת
app.post('/api/orders', (req, res) => {
  const { customerName, phone, deliveryAddress, pizzas } = req.body;

  if (!customerName || !phone || !deliveryAddress || !pizzas || !Array.isArray(pizzas) || pizzas.length === 0) {
    return res.status(400).json({ error: 'Missing customer details or empty pizza list.' });
  }

  let calculatedTotal = 0;

  for (const item of pizzas) {
    // וולידציה מתוקנת: תומכת ב-item.type ו-item.size
    if (!MENU.pizzas[item.type] || !MENU.sizes[item.size]) {
      return res.status(400).json({ error: 'Invalid pizza type or size.' });
    }
    if (!Array.isArray(item.toppings) || item.toppings.length > 3) {
      return res.status(400).json({ error: 'Each pizza can have maximum 3 toppings.' });
    }

    // כלל אישי (ספרה אחרונה 8): מניעת כפל תוספות זהות
    const uniqueToppings = new Set(item.toppings);
    if (uniqueToppings.size !== item.toppings.length) {
      return res.status(400).json({ error: 'Cannot choose the same topping multiple times on a single pizza.' });
    }

    let pizzaPrice = MENU.pizzas[item.type] + MENU.sizes[item.size];
    for (const topping of item.toppings) {
      if (!MENU.toppings[topping]) {
        return res.status(400).json({ error: `Invalid topping: ${topping}` });
      }
      pizzaPrice += MENU.toppings[topping];
    }
    calculatedTotal += pizzaPrice;
  }

  const newOrder = {
    id: String(nextOrderId++),
    customerName,
    phone,
    deliveryAddress,
    pizzas,
    totalPrice: calculatedTotal,
    status: 'new',
    paymentStatus: 'paid_mock',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// GET /api/orders
app.get('/api/orders', (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(orders.filter(o => o.status === status));
  }
  res.json(orders);
});

// GET /api/orders/:id
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// PATCH /api/orders/:id/status
app.patch('/api/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { status: nextStatus } = req.body;
  if (!nextStatus) return res.status(400).json({ error: 'Missing status in body' });

  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    return res.status(409).json({ error: `Invalid status transition from ${order.status} to ${nextStatus}` });
  }

  order.status = nextStatus;
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
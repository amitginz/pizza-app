import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [menu, setMenu] = useState(null);
  const [selectedType, setSelectedType] = useState('Margherita');
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ customerName: '', phone: '', deliveryAddress: '' });
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [trackId, setTrackId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [employeeOrders, setEmployeeOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/menu`)
      .then(res => res.json())
      .then(data => {
        setMenu(data);
        if (data.pizzas) setSelectedType(Object.keys(data.pizzas)[0]);
        if (data.sizes) setSelectedSize(Object.keys(data.sizes)[0]);
      }).catch(err => console.error("Server connection failed", err));
    refreshStaffPanels();
  }, []);

  const refreshStaffPanels = () => {
    Promise.all([
      fetch(`${API_BASE}/orders?status=new`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/orders?status=preparing`).then(r => r.json()).catch(() => [])
    ]).then(([news, preps]) => setEmployeeOrders([...news, ...preps]));

    fetch(`${API_BASE}/orders?status=ready`)
      .then(r => r.json())
      .then(data => setDeliveryOrders(data))
      .catch(() => []);
  };

  const handleToppingChange = (topping) => {
    if (selectedToppings.includes(topping)) {
      setSelectedToppings(selectedToppings.filter(t => t !== topping));
    } else {
      if (selectedToppings.length >= 3) {
        alert("מקסימום 3 תוספות לפיצה!");
        return;
      }
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  // פונקציית הוספה לעגלה מתוקנת המסנכרנת שדות type ו-size בדיוק
  const addToCart = () => {
    const newItem = {
      type: selectedType,
      size: selectedSize,
      toppings: [...selectedToppings]
    };
    setCart([...cart, newItem]);
    setSelectedToppings([]);
  };

  const estimatedTotal = cart.reduce((sum, item) => {
    const base = menu?.pizzas[item.type] || 0;
    const sizeCost = menu?.sizes[item.size] || 0;
    const toppingsCost = item.toppings.reduce((s, t) => s + (menu?.toppings[t] || 0), 0);
    return sum + base + sizeCost + toppingsCost;
  }, 0);

  const handleCheckout = async () => {
    if (!customer.customerName || !customer.phone || !customer.deliveryAddress || cart.length === 0) {
      alert("יש למלא את כל פרטי המשלוח ולהוסיף פיצה לעגלה");
      return;
    }
    const payload = { ...customer, pizzas: cart };
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      setConfirmedOrder(data);
      setCart([]);
      refreshStaffPanels();
    } else {
      const err = await res.json();
      alert(`שגיאה: ${err.error}`);
    }
  };

  const trackOrder = async () => {
    if (!trackId) return;
    const res = await fetch(`${API_BASE}/orders/${trackId}`);
    if (res.ok) {
      setTrackedOrder(await res.json());
    } else {
      alert("הזמנה לא נמצאה");
      setTrackedOrder(null);
    }
  };

  const updateStatus = async (id, nextStatus) => {
    setErrorMsg('');
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) {
      refreshStaffPanels();
    } else {
      const err = await res.json();
      setErrorMsg(`שגיאה: ${err.error}`);
    }
  };

  if (!menu) return <div style={{ padding: '20px' }}>טוען תפריט ומחבר לשרת...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <h1>🍕 מערכת הזמנת פיצה</h1>
      <hr />
      <section>
        <h2>👤 מסך לקוח</h2>
        <div data-testid="menu-list" style={{ background: '#f9f9f9', padding: '10px', marginBottom: '10px' }}>
          <h3>📋 תפריט</h3>
          <div><strong>פיצות:</strong> {Object.entries(menu.pizzas).map(([k, v]) => `${k} (${v}₪)`).join(' | ')}</div>
          <div><strong>גדלים:</strong> {Object.entries(menu.sizes).map(([k, v]) => `${k} (+${v}₪)`).join(' | ')}</div>
          <div><strong>תוספות:</strong> {Object.entries(menu.toppings).map(([k, v]) => `${k} (${v}₪)`).join(' | ')}</div>
        </div>

        <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
          <h4>🛠️ הרכב פיצה</h4>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            {Object.keys(menu.pizzas).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}>
            {Object.keys(menu.sizes).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <h5>תוספות (עד 3):</h5>
          {Object.keys(menu.toppings).map(t => (
            <label key={t} style={{ marginLeft: '10px' }}>
              <input type="checkbox" checked={selectedToppings.includes(t)} onChange={() => handleToppingChange(t)} /> {t}
            </label>
          ))}
          <br /><br />
          <button onClick={addToCart}>הוסף לעגלה 🛒</button>
        </div>

        <div data-testid="cart" style={{ background: '#eef9ff', padding: '10px', marginBottom: '10px' }}>
          <h3>🛒 עגלת קניות</h3>
          {cart.length === 0 ? <p>העגלה ריקה</p> : (
            <ul>
              {cart.map((item, idx) => <li key={idx}>{item.size} {item.type} - תוספות: {item.toppings.join(', ') || 'ללא'}</li>)}
            </ul>
          )}
        </div>

        <div data-testid="order-summary-panel" style={{ background: '#fff3cd', padding: '10px', marginBottom: '10px' }}>
          <h3>💰 סיכום הזמנה משוער</h3>
          <p>מחיר משוער זמני: <strong>{estimatedTotal} ₪</strong></p>
        </div>

        <div style={{ background: '#f2f2f2', padding: '10px', marginBottom: '10px' }}>
          <h3>📦 פרטי משלוח ותשלום מדומה</h3>
          <input type="text" placeholder="שם מלא" value={customer.customerName} onChange={e => setCustomer({ ...customer, customerName: e.target.value })} /><br />
          <input type="text" placeholder="טלפון" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /><br />
          <input type="text" placeholder="כתובת" value={customer.deliveryAddress} onChange={e => setCustomer({ ...customer, deliveryAddress: e.target.value })} /><br /><br />
          <button data-testid="checkout-button" onClick={handleCheckout}>בצע תשלום מדומה ושלח הזמנה 🚀</button>
        </div>

        {confirmedOrder && (
          <div data-testid="order-confirmation" style={{ background: '#d4edda', color: '#155724', padding: '15px', marginBottom: '10px' }}>
            <h3>✅ ההזמנה בוצעה בהצלחה!</h3>
            <p>מספר הזמנה: <strong>{confirmedOrder.id}</strong></p>
            <p>סטטוס: <strong>{confirmedOrder.status}</strong></p>
            <p>מחיר סופי מאושר: <strong>{confirmedOrder.totalPrice} ₪</strong></p>
          </div>
        )}

        <div style={{ background: '#f8d7da', padding: '10px', marginBottom: '20px' }}>
          <h3>🔍 מעקב סטטוס</h3>
          <input type="text" placeholder="מזהה הזמנה" value={trackId} onChange={e => setTrackId(e.target.value)} />
          <button onClick={trackOrder}>בדוק</button>
          {trackedOrder && <p>מצב הנוכחי: <strong>{trackedOrder.status}</strong></p>}
        </div>
      </section>

      <hr />
      {errorMsg && <div style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</div>}

      <section data-testid="employee-orders" style={{ border: '2px solid #007bff', padding: '15px', marginBottom: '20px' }}>
        <h2>🧑‍🍳 מסך עובד מסעדה</h2>
        {employeeOrders.length === 0 ? <p>אין הזמנות</p> : (
          <table border="1" cellPadding="5" style={{ width: '100%', textAlign: 'center' }}>
            <thead>
              <tr><th>מזהה</th><th>לקוח</th><th>פיצות</th><th>מחיר</th><th>סטטוס</th><th>פעולה</th></tr>
            </thead>
            <tbody>
              {employeeOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customerName}</td>
                  <td>{o.pizzas.map(p => `${p.size} ${p.type}`).join(' | ')}</td>
                  <td>{o.totalPrice} ₪</td>
                  <td>{o.status}</td>
                  <td>
                    {o.status === 'new' && <button onClick={() => updateStatus(o.id, 'preparing')}>העבר להכנה</button>}
                    {o.status === 'preparing' && <button onClick={() => updateStatus(o.id, 'ready')}>סמן כהושלם</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section data-testid="delivery-orders" style={{ border: '2px solid #28a745', padding: '15px' }}>
        <h2>🚴 מסך שליח</h2>
        {deliveryOrders.length === 0 ? <p>אין משלוחים מוכנים</p> : (
          <table border="1" cellPadding="5" style={{ width: '100%', textAlign: 'center' }}>
            <thead>
              <tr><th>מזהה</th><th>שם</th><th>כתובת</th><th>פעולה</th></tr>
            </thead>
            <tbody>
              {deliveryOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customerName}</td>
                  <td>{o.deliveryAddress}</td>
                  <td><button onClick={() => updateStatus(o.id, 'delivered')}>נמסר בהצלחה</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
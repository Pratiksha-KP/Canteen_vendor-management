import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pool from "./db.js"; // Make sure this file correctly configures your pg pool
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); // for Twilio webhook

// --- Environment Variables & Constants ---
const JWT_SECRET = process.env.JWT_SECRET;
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

if (!JWT_SECRET || !TWILIO_SID || !TWILIO_AUTH || !TWILIO_PHONE) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

const client = twilio(TWILIO_SID, TWILIO_AUTH);

// ---------------- Twilio Helper Function ----------------
async function sendSMS(to, message) {
  try {
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE,
      to,
    });
    console.log(`✅ SMS sent to ${to}: "${message}"`);
  } catch (err) {
    console.error("❌ SMS sending error:", err.message);
  }
}

// ---------------- Auth Middleware ----------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided. Please log in." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Malformed token." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
}

// ---------------- VENDOR: Register ----------------
// Note: In a real app, you'd have an admin create vendors.
// This endpoint is for demonstration.
app.post("/vendor/register", async (req, res) => {
  const { canteenId, username, password, name } = req.body;
  if (!canteenId || !username || !password || !name) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO vendors (name, username, password_hash, canteen_id) VALUES ($1, $2, $3, $4) RETURNING id, username",
      [name, username, hashedPassword, canteenId]
    );
    res.status(201).json({ message: "Vendor registered successfully", vendor: result.rows[0] });
  } catch (err) {
    console.error("❌ Error registering vendor:", err.message);
    res.status(500).json({ error: "Registration failed. Username may already exist." });
  }
});

// ---------------- VENDOR: Login ----------------
app.post("/vendor/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash, canteen_id FROM vendors WHERE username=$1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const vendor = result.rows[0];
    const isValid = await bcrypt.compare(password, vendor.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: vendor.id, canteenId: vendor.canteen_id },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

// ---------------- VENDOR: Get Menu for their Canteen ----------------
app.get("/menu", authMiddleware, async (req, res) => {
  // The canteenId is extracted from the JWT token by the authMiddleware
  const canteenId = req.user.canteenId;

  try {
    const result = await pool.query(
      "SELECT id, name, price, is_available FROM menuitems WHERE canteen_id = $1 ORDER BY name ASC",
      [canteenId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching menu:", err.message);
    res.status(500).json({ error: "Failed to fetch menu." });
  }
});

// ---------------- VENDOR: Create Order ----------------
app.post("/order", authMiddleware, async (req, res) => {
  const { studentName, phoneNo, items } = req.body;
  const vendorId = req.user.id;
  
  if (!studentName || !phoneNo || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data provided." });
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const orderResult = await dbClient.query(
      "INSERT INTO orders (student_name, phone_no, vendor_id, status, total_amount) VALUES ($1, $2, $3, 'pending', 0) RETURNING id",
      [studentName, phoneNo, vendorId]
    );
    const orderId = orderResult.rows[0].id;

    let totalAmount = 0;

    for (const item of items) {
      const menuItemResult = await dbClient.query("SELECT price FROM menuitems WHERE id = $1 AND is_available = TRUE", [item.item_id]);
      if (menuItemResult.rows.length === 0) {
        throw new Error(`Item with ID ${item.item_id} is not available or does not exist.`);
      }
      const price = parseFloat(menuItemResult.rows[0].price);
      totalAmount += price * item.quantity;

      await dbClient.query(
        "INSERT INTO orderitems (order_id, menu_item_id, quantity, price_at_order) VALUES ($1, $2, $3, $4)",
        [orderId, item.item_id, item.quantity, price]
      );
    }

    await dbClient.query("UPDATE orders SET total_amount = $1 WHERE id = $2", [totalAmount.toFixed(2), orderId]);
    await dbClient.query('COMMIT');

    const queuePosResult = await dbClient.query("SELECT queue_position FROM orders WHERE id = $1", [orderId]);
    const queuePosition = queuePosResult.rows[0].queue_position;

    await sendSMS(
      phoneNo,
      `✅ Your order has been placed! Your queue position is #${queuePosition}. Estimated wait: 15 mins.`
    );

    res.status(201).json({ orderId, status: 'pending', queuePosition });

  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error("❌ Error creating order:", err.message);
    res.status(500).json({ error: "Failed to create order. " + err.message });
  } finally {
    dbClient.release();
  }
});


// ---------------- VENDOR: Get Analytics Dashboard ----------------
app.get("/analytics", authMiddleware, async (req, res) => {
  const vendorId = req.user.id;
  const canteenId = req.user.canteenId;

  try {
    // 1. Total Sales and Orders for Today
    const salesResult = await pool.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) AS total_sales,
         COUNT(*) AS total_orders
       FROM orders
       WHERE vendor_id = $1
         AND DATE(created_at) = CURRENT_DATE`,
      [vendorId]
    );

    // 2. Most Popular Items (for the whole canteen)
    const popularItemsResult = await pool.query(
      `SELECT 
         mi.name, 
         SUM(oi.quantity) AS total_sold
       FROM orderitems oi
       JOIN menuitems mi ON oi.menu_item_id = mi.id
       WHERE mi.canteen_id = $1
       GROUP BY mi.name
       ORDER BY total_sold DESC
       LIMIT 5`, // Get top 5 items
      [canteenId]
    );

    // 3. Order Status Breakdown (for the logged-in vendor)
    const statusResult = await pool.query(
      `SELECT 
         status, 
         COUNT(*) AS count
       FROM orders
       WHERE vendor_id = $1
         AND status IN ('pending', 'preparing', 'almost ready', 'ready')
       GROUP BY status`,
      [vendorId]
    );

    res.json({
      salesToday: salesResult.rows[0],
      popularItems: popularItemsResult.rows,
      statusBreakdown: statusResult.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching analytics:", err.message);
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

// ---------------- VENDOR: Get Orders for their Canteen ----------------
app.get("/orders", authMiddleware, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC",
      [vendorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching orders:", err.message);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// ---------------- VENDOR: Update Order Status ----------------
app.put("/order/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const vendorId = req.user.id;

  try {
    const result = await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2 AND vendor_id=$3 RETURNING *",
      [status, orderId, vendorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found or you do not have permission to update it." });
    }

    const order = result.rows[0];
    let message = "";
    if (status === "preparing") message = "🍴 Your order is being prepared.";
    else if (status === "almost ready") message = "⚡ Almost ready! Please head to the counter.";
    else if (status === "ready") message = "✅ Your order is ready for pickup!";

    if (message) {
      await sendSMS(order.phone_no, message);
    }

    res.json({ message: "Status updated successfully", order });
  } catch (err) {
    console.error("❌ Error updating order:", err.message);
    res.status(500).json({ error: "Failed to update order status." });
  }
});

// ---------------- Twilio Webhook: Student Cancel ----------------
app.post("/sms", async (req, res) => {
  const msg = req.body.Body?.trim().toUpperCase();
  const from = req.body.From;

  if (msg === "DROP") {
    try {
      const result = await pool.query(
        `UPDATE orders SET status='cancelled' 
         WHERE id = (
           SELECT id FROM orders 
           WHERE phone_no = $1 AND status = 'pending' 
           ORDER BY created_at DESC 
           LIMIT 1
         ) 
         RETURNING id`,
        [from]
      );

      if (result.rows.length > 0) {
        await sendSMS(from, "❌ Your most recent order has been dropped.");
      }
    } catch (err) {
      console.error("❌ SMS drop error:", err.message);
    }
  }

  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");
});

// ---------------- VENDOR: Add a new Menu Item ----------------
app.post("/menu", authMiddleware, async (req, res) => {
  const { name, price, description } = req.body;
  const canteenId = req.user.canteenId;

  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO menuitems (name, price, description, canteen_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, price, description, canteenId]
    );
    res.status(201).json({ message: "Item added to menu", item: result.rows[0] });
  } catch (err) {
    console.error("❌ Error adding menu item:", err.message);
    res.status(500).json({ error: "Failed to add item." });
  }
});

// ---------------- VENDOR: Update a Menu Item (Price, Availability, etc.) ----------------
app.put("/menu/:id", authMiddleware, async (req, res) => {
  const itemId = req.params.id;
  const { name, price, description, is_available } = req.body;
  const canteenId = req.user.canteenId; // To ensure vendor can only edit their own items

  try {
    const result = await pool.query(
      `UPDATE menuitems 
       SET 
         name = $1, 
         price = $2, 
         description = $3, 
         is_available = $4 
       WHERE id = $5 AND canteen_id = $6 RETURNING *`,
      [name, price, description, is_available, itemId, canteenId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found or you do not have permission to edit it." });
    }
    res.json({ message: "Item updated successfully", item: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating menu item:", err.message);
    res.status(500).json({ error: "Failed to update item." });
  }
});

// ---------------- VENDOR: Delete a Menu Item ----------------
app.delete("/menu/:id", authMiddleware, async (req, res) => {
  const itemId = req.params.id;
  const canteenId = req.user.canteenId; // Security check

  try {
    const result = await pool.query(
      "DELETE FROM menuitems WHERE id = $1 AND canteen_id = $2 RETURNING *",
      [itemId, canteenId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found or you do not have permission to delete it." });
    }
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting menu item:", err.message);
    // This will fail if the item is part of an existing order in 'orderitems'
    // This is a good thing (referential integrity)!
    res.status(500).json({ error: "Failed to delete item. It may be part of an existing order." });
  }
});

// ---------------- Start Vendor Server ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Canteen server running on http://localhost:${PORT}`);
});
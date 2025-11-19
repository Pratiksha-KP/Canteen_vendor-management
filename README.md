🍔 BiteDash
A Real-Time Canteen Ordering & Management System modelled on my university canteens

BiteDash is a full-stack web application designed to streamline university canteen operations. It enables a seamless food ordering experience between students and canteen vendors with real-time tracking, SMS updates, and live analytics.

🚀 Features
👨‍🍳 For Vendors

📊 Live Dashboard: Real-time view of incoming orders with a smart queue system

🧾 Menu Management: Add, edit, delete, or toggle item availability anytime

🔁 Order Workflow: One-click status updates (Preparing → Almost Ready → Ready)

📈 Analytics: Daily sales, total orders & popular items visualized with charts

📱 For Students

✉️ SMS Notifications: Automated via Twilio

🔢 Queue Tracking: Live queue position updates

❌ SMS Cancellation: Reply "DROP" to instantly cancel an order

Here is a professional, portfolio-ready README.md for your project.



🚀 Features
👨‍🍳 For Vendors
Live Dashboard: Real-time view of incoming orders with a smart queuing system.

Menu Management: Add, edit, delete, and toggle availability of food items instantly.

Order Workflow: Update status (Preparing → Almost Ready → Ready) with one click.

Analytics: Visual charts showing daily sales, total orders, and most popular items.

📱 For Students
SMS Notifications: Automated updates via Twilio when orders are placed, preparing, or ready.

Queue Tracking: Receive real-time queue position updates.

SMS Cancellation: Students can reply "DROP" to the SMS to instantly cancel their order and free up the queue.

🛠️ Tech Stack
Frontend: React.js (Vite), Tailwind CSS, Lucide React

Backend: Node.js, Express.js

Database: PostgreSQL 

Authentication: JWT (JSON Web Tokens), bcrypt

Notifications: Twilio Programmable SMS API + Webhooks

⚙️ System Architecture

The system uses a relational data model powered by PostgreSQL, enhanced with custom PL/pgSQL triggers for efficient queue logic.

🗄️ Database Schema Overview

Vendors → Admin credentials & canteen mapping

Canteens → University eatery locations

MenuItems → Food items linked to canteens

Orders → Tracks student details, total, order status

OrderItems → Junction table (Orders ↔ MenuItems)

🔑 Key Technical Highlights

💡 Database Triggers

set_order_defaults → Automatically assigns queue number based on current load

update_queue_after_status_change → Reorders queue on completion/cancellation

🔄 Bidirectional Webhooks

Twilio parses incoming "DROP" SMS → backend updates database → order cancelled

📦 Installation & Setup
✅ Prerequisites

Node.js installed

PostgreSQL database (local or cloud)

Twilio Account (SID, Auth Token, SMS-enabled number)

1️⃣ Clone the Repository
git clone https://github.com/your-username/canteenflow.git
cd bitedash

2️⃣ Backend Setup
cd backend
npm install


Create .env:

DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your_super_secret_random_string"
TWILIO_SID="your_twilio_sid"
TWILIO_AUTH="your_twilio_auth_token"
TWILIO_PHONE="+1234567890"


Start backend:

node server.js

3️⃣ Frontend Setup
cd ../frontend
npm install


Create .env (optional local, required prod):

VITE_API_BASE_URL="http://localhost:3000"


Run frontend:

npm run dev

🧪 Testing SMS Webhooks Locally

Expose backend with ngrok:

ngrok http 3000


Copy HTTPS URL (example):

https://random.ngrok-free.app


Twilio Console → Phone Number → Messaging →
A Message Comes In → Webhook URL

https://random.ngrok-free.app/api/sms

📸 Screenshots

Signup and Login page:
![Signup and Login Page](assets/Login and Signup.png)

Empty Dashboard:
![Empty Dashboard Page](assets/Empty Orders.png)

Creation of order:
![Creation Page](assets/Creating order.png)

Editing item order:
![Empty Dashboard Page](assets/Empty Orders.png)

Item addition in menu:
![Item addition in menu](assets/Item addition in menu.png)

Active order in dashboard:
![Active order](assets/Active orders to start.png)

Order almost ready:
![Order almost ready](assets/Order almost ready.png)

Order ready and to be picked up:
![Order ready](assets/Order ready.png)


⭐ Contributions & Support

Pull requests welcome!
For major changes, please open an issue first to discuss improvements.

📝 License

This project is licensed under the MIT License.